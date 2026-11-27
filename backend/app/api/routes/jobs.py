"""
Video processing job endpoints for TrafficLens-AI backend.

Wires HTTP routes to SQLAlchemy persistence, JobWorker, and results retrieval.
"""

from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import threading
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from backend.app.core.config import Settings
from backend.app.core.logging import get_logger
from backend.app.dependencies import get_app_settings, get_db_session
from backend.app.repositories.job_repository import SQLAlchemyJobRepository
from backend.app.services.job_service import JobService
from backend.app.services.media_delivery import (
    create_media_stream_response,
    validate_path_containment,
)
from backend.app.services.worker import get_job_worker, QueueFullError
from backend.app.schemas import (
    JobStatus,
    ProcessingJobCreateSchema,
    ProcessingJobResponseSchema,
    JobTelemetryResponseSchema,
    JobResultsResponseSchema,
    JobArtifactItemSchema,
    JobArtifactsResponseSchema,
    DetectionSummarySchema,
    TrackingSummarySchema,
    TrafficAnalyticsSummarySchema,
)

logger = get_logger("trafficlens.api.jobs")
router = APIRouter(prefix="/jobs", tags=["Jobs"])
_job_create_lock = threading.Lock()


@router.get(
    "",
    response_model=List[ProcessingJobResponseSchema],
    summary="List all processing jobs with optional status filter",
)
def list_jobs(
    status_filter: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db_session),
) -> List[ProcessingJobResponseSchema]:
    """
    Returns a paginated list of all processing jobs, ordered by creation time descending.
    Optionally filtered by status (QUEUED, PROCESSING, COMPLETED, FAILED).
    """
    repo = SQLAlchemyJobRepository(db)
    all_jobs = repo.list_jobs(limit=limit, offset=offset)
    if status_filter:
        status_upper = status_filter.upper()
        all_jobs = [j for j in all_jobs if j.status.value == status_upper or j.status == status_upper]
    return all_jobs


@router.post(
    "",
    response_model=ProcessingJobResponseSchema,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create and queue a video processing job",
)
def create_job(
    payload: ProcessingJobCreateSchema,
    db: Session = Depends(get_db_session),
) -> ProcessingJobResponseSchema:
    """
    Submits a video processing job to the asynchronous processing queue.
    Persists the job in status QUEUED and dispatches to the background worker.
    """
    if not payload.video_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Field 'video_id' is required when creating a job via POST /jobs.",
        )

    with _job_create_lock:
        repo = SQLAlchemyJobRepository(db)

        # Ensure associated VideoAsset exists; register asset if not yet created
        asset = repo.get_video_asset(payload.video_id)
        if not asset:
            asset = repo.create_video_asset(
                video_id=payload.video_id,
                filename=f"{payload.video_id}.mp4",
                storage_path=f"storage/uploads/{payload.video_id}.mp4",
                file_size_bytes=1024 * 1024,
                duration_seconds=30.0,
                fps=25.0,
                width=960,
                height=540,
            )

        # Check for active job (QUEUED or PROCESSING)
        active_jobs = [j for j in asset.jobs if j.status in (JobStatus.QUEUED, JobStatus.PROCESSING)]
        if active_jobs:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Video '{payload.video_id}' already has an active processing job ({active_jobs[0].id}) "
                    f"in state {active_jobs[0].status.value}."
                ),
            )

        # Prepare config metadata
        config_meta = {}
        if payload.lines:
            config_meta["lines"] = [l.model_dump() for l in payload.lines]
        if payload.rois:
            config_meta["rois"] = [r.model_dump() for r in payload.rois]

        job_id = f"job_{uuid.uuid4().hex[:12]}"
        seq_name = payload.sequence_name or f"seq_{payload.video_id}"

        try:
            created_model = repo.create_job(
                job_id=job_id,
                video_id=payload.video_id,
                sequence_name=seq_name,
                status=JobStatus.QUEUED,
                config_metadata=config_meta if config_meta else None,
            )
            db.flush()
            # Enqueue to background worker before committing to prevent stranded QUEUED jobs
            get_job_worker().enqueue_job(job_id)
            db.commit()
        except QueueFullError as e:
            db.rollback()
            logger.warning(
                f"Worker queue full while scheduling job {job_id} for video {payload.video_id}. Rolled back transaction."
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(e),
            )

        return repo._model_to_schema(created_model)


@router.get(
    "/{job_id}",
    response_model=ProcessingJobResponseSchema,
    summary="Get processing job status",
)
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db_session),
) -> ProcessingJobResponseSchema:
    """Retrieves current execution status and timestamps for a persisted job."""
    repo = SQLAlchemyJobRepository(db)
    service = JobService(repository=repo)
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    return job


@router.get(
    "/{job_id}/results",
    response_model=JobResultsResponseSchema,
    summary="Get structured telemetry results and artifacts for a completed job",
)
def get_job_results(
    job_id: str,
    db: Session = Depends(get_db_session),
) -> JobResultsResponseSchema:
    """
    Returns detection, tracking, and traffic analytics results and artifacts
    for a COMPLETED job. Rejects if job is still in progress (409) or failed (409).
    """
    repo = SQLAlchemyJobRepository(db)
    job = repo.get_job_model(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' is currently {job.status.value}. Results are not available yet.",
        )

    if job.status == JobStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' failed: {job.error_message or 'Unknown pipeline failure'}",
        )

    # Job is COMPLETED: load results from config_metadata
    det_summary = None
    track_summary = None
    analytics_summary = None
    artifacts = {}
    annotation_diagnostics = None

    if job.config_metadata and "results" in job.config_metadata:
        res = job.config_metadata["results"]
        if "detection_summary" in res and res["detection_summary"]:
            det_summary = DetectionSummarySchema(**res["detection_summary"])
        if "tracking_summary" in res and res["tracking_summary"]:
            track_summary = TrackingSummarySchema(**res["tracking_summary"])
        if "analytics_summary" in res and res["analytics_summary"]:
            analytics_summary = TrafficAnalyticsSummarySchema(**res["analytics_summary"])
        if "artifacts" in res and res["artifacts"]:
            artifacts = dict(res["artifacts"])
        if "annotation_diagnostics" in res:
            annotation_diagnostics = res["annotation_diagnostics"]

    return JobResultsResponseSchema(
        job_id=job.id,
        video_id=job.video_id,
        sequence_name=job.sequence_name,
        status=job.status.value,
        duration_seconds=job.duration_seconds,
        detection_summary=det_summary,
        tracking_summary=track_summary,
        analytics_summary=analytics_summary,
        artifacts=artifacts,
        annotation_diagnostics=annotation_diagnostics,
    )


@router.get(
    "/{job_id}/annotated-video",
    summary="Stream rendered annotated video media with HTTP Range support",
    responses={
        200: {"description": "Full annotated video content"},
        206: {"description": "Partial video content (Range response)"},
        403: {"description": "Security policy violation: artifact path escapes output directory"},
        404: {"description": "Job or annotated video artifact not found"},
        409: {"description": "Job is not completed yet or failed"},
        416: {"description": "Range Not Satisfiable"},
    },
)
def stream_annotated_video(
    job_id: str,
    range: Optional[str] = Header(None, alias="Range"),
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
) -> Response:
    """
    Streams the rendered annotated video media file for a COMPLETED job.
    Enforces directory containment within settings.OUTPUT_DIR, verifies artifact existence,
    and supports RFC 9110 HTTP Range seeking.
    """
    repo = SQLAlchemyJobRepository(db)
    job = repo.get_job_model(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' is currently {job.status.value}. Annotated video is not ready.",
        )

    if job.status == JobStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' failed: {job.error_message or 'Execution failed'}. Annotated video unavailable.",
        )

    # Resolve from trusted server-side config_metadata
    artifacts = {}
    if job.config_metadata and "results" in job.config_metadata:
        artifacts = job.config_metadata["results"].get("artifacts", {})

    annotated_raw = artifacts.get("annotated_video")
    if not annotated_raw:
        diag = {}
        if job.config_metadata and "results" in job.config_metadata:
            diag = job.config_metadata["results"].get("annotation_diagnostics", {})
        err_detail = diag.get("error_message") or "Annotated video artifact was not generated for this job."
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotated video unavailable: {err_detail}",
        )

    target_path = Path(annotated_raw).resolve()
    permitted_dir = settings.OUTPUT_DIR.resolve()

    if not validate_path_containment(target_path, permitted_dir):
        logger.warning(
            f"Security alert: job {job_id} annotated video path '{annotated_raw}' escapes output directory '{permitted_dir}'."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Artifact path escapes permitted output directory.",
        )

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Annotated video artifact file for job '{job_id}' not found on server storage.",
        )

    return create_media_stream_response(
        file_path=target_path,
        range_header=range,
        content_type="video/mp4",
        permitted_directory=permitted_dir,
    )


@router.get(
    "/{job_id}/artifacts",
    response_model=JobArtifactsResponseSchema,
    summary="List available artifacts and delivery endpoints for a job",
    responses={
        200: {"description": "List of available artifact metadata items"},
        404: {"description": "Job not found"},
        409: {"description": "Job is not completed yet or failed"},
    },
)
def list_job_artifacts(
    job_id: str,
    db: Session = Depends(get_db_session),
    settings: Settings = Depends(get_app_settings),
) -> JobArtifactsResponseSchema:
    """
    Returns structured metadata for all artifacts generated by a COMPLETED job.
    Verifies physical on-disk existence without exposing server filesystem paths.
    """
    repo = SQLAlchemyJobRepository(db)
    job = repo.get_job_model(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    if job.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' is currently {job.status.value}. Artifacts are not available yet.",
        )

    if job.status == JobStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job '{job_id}' failed: {job.error_message or 'Unknown failure'}. Artifacts unavailable.",
        )

    raw_artifacts = {}
    if job.config_metadata and "results" in job.config_metadata:
        raw_artifacts = job.config_metadata["results"].get("artifacts", {})

    output_dir = settings.OUTPUT_DIR.resolve()
    artifact_items: List[JobArtifactItemSchema] = []
    has_video_artifact = False

    for name, raw_path in raw_artifacts.items():
        if name == "annotation_diagnostics":
            continue
        p = Path(raw_path).resolve()
        is_contained = validate_path_containment(p, output_dir)
        is_available = is_contained and p.exists() and p.is_file()
        file_size = p.stat().st_size if is_available else None

        # Determine data format category and serving URL
        if name.endswith("_json") or p.suffix.lower() == ".json":
            atype = "json"
            serving_url = f"/api/v1/jobs/{job_id}/results"
        elif name.endswith("_csv") or p.suffix.lower() == ".csv":
            atype = "csv"
            serving_url = None  # Dedicated CSV download endpoint deferred
        elif "video" in name or p.suffix.lower() in (".mp4", ".avi", ".mov", ".mkv"):
            atype = "video"
            serving_url = f"/api/v1/jobs/{job_id}/annotated-video"
            has_video_artifact = True
        else:
            atype = "file"
            serving_url = None

        artifact_items.append(
            JobArtifactItemSchema(
                name=name,
                filename=p.name,
                artifact_type=atype,
                is_available=is_available,
                file_size_bytes=file_size,
                serving_url=serving_url,
            )
        )

    # If annotated video was not generated or failed, expose an explicit artifact item with is_available=False
    if not has_video_artifact:
        artifact_items.append(
            JobArtifactItemSchema(
                name="annotated_video",
                filename=f"{job.sequence_name}_annotated.mp4",
                artifact_type="video",
                is_available=False,
                file_size_bytes=None,
                serving_url=f"/api/v1/jobs/{job_id}/annotated-video",
            )
        )

    return JobArtifactsResponseSchema(
        job_id=job.id,
        status=job.status,
        artifacts=artifact_items,
    )



@router.get(
    "/{job_id}/telemetry",
    response_model=JobTelemetryResponseSchema,
    summary="Get telemetry payload (backward-compatible)",
)
def get_job_telemetry(
    job_id: str,
    db: Session = Depends(get_db_session),
) -> JobTelemetryResponseSchema:
    """Returns telemetry summary for a job."""
    repo = SQLAlchemyJobRepository(db)
    job = repo.get_job_model(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    det_summary = None
    track_summary = None
    analytics_summary = None
    if job.config_metadata and "results" in job.config_metadata:
        res = job.config_metadata["results"]
        if "detection_summary" in res and res["detection_summary"]:
            det_summary = DetectionSummarySchema(**res["detection_summary"])
        if "tracking_summary" in res and res["tracking_summary"]:
            track_summary = TrackingSummarySchema(**res["tracking_summary"])
        if "analytics_summary" in res and res["analytics_summary"]:
            analytics_summary = TrafficAnalyticsSummarySchema(**res["analytics_summary"])

    return JobTelemetryResponseSchema(
        job_id=job.id,
        video_id=job.video_id,
        sequence_name=job.sequence_name,
        detection_summary=det_summary,
        tracking_summary=track_summary,
        analytics_summary=analytics_summary,
    )
