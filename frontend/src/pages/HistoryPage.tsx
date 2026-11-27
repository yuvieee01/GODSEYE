import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Video,
  MonitorPlay,
  ClipboardList,
  RotateCw,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/feedback/EmptyState";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { StatusBadge } from "../components/common/StatusBadge";
import { jobService } from "../services/jobService";
import { videoService } from "../services/videoService";
import { ProcessingJob, JobStatus } from "../types/job";
import { VideoMetadata } from "../types/video";
import { buildWorkspaceUrl, buildJobDetailsUrl, ROUTES } from "../core/routes";

const statusIcon = (status: JobStatus) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "PROCESSING":
      return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    case "QUEUED":
      return <Clock className="w-4 h-4 text-amber-400" />;
  }
};

const formatRelativeTime = (isoDate: string): string => {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const HistoryPage: React.FC = () => {
  // Fetch all jobs (all statuses)
  const {
    data: jobs,
    isLoading: jobsLoading,
    isError: jobsError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["allJobs"],
    queryFn: () => jobService.listJobs(),
    staleTime: 5000,
  });

  // Fetch all videos to map video_id → filename
  const { data: videos } = useQuery({
    queryKey: ["videos"],
    queryFn: () => videoService.listVideos(),
    staleTime: 10000,
  });

  const videoMap = React.useMemo(() => {
    const map = new Map<string, VideoMetadata>();
    if (videos) {
      for (const v of videos) {
        map.set(v.video_id, v);
      }
    }
    return map;
  }, [videos]);

  // Sort jobs by created_at descending (newest first)
  const sortedJobs = React.useMemo(() => {
    if (!jobs) return [];
    return [...jobs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [jobs]);

  const completedCount = sortedJobs.filter((j) => j.status === "COMPLETED").length;
  const failedCount = sortedJobs.filter((j) => j.status === "FAILED").length;
  const activeCount = sortedJobs.filter(
    (j) => j.status === "QUEUED" || j.status === "PROCESSING"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        category="Analysis Records"
        title="Processing History"
        subtitle="Complete timeline of all video analysis jobs — completed, in-progress, and failed"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              icon={
                <RotateCw
                  className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
              }
            >
              Refresh
            </Button>
            <Link to={ROUTES.VIDEOS}>
              <Button
                variant="primary"
                size="sm"
                icon={<Video className="w-4 h-4" />}
              >
                Video Library
              </Button>
            </Link>
          </div>
        }
      />

      {/* Summary Stats Row */}
      {sortedJobs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
              Total Jobs
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-[#F9FAFB]">
              {sortedJobs.length}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
              Completed
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400">
              {completedCount}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
              Active
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-cyan-400">
              {activeCount}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-[#111827] border border-[#1F2937]">
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">
              Failed
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-red-400">
              {failedCount}
            </div>
          </div>
        </div>
      )}

      {/* History Timeline */}
      <SectionCard
        title="Analysis History Timeline"
        description="All video processing jobs with direct links to workspace and job audit trail"
        badge={
          sortedJobs.length > 0 ? (
            <Badge variant="cyan" size="sm">
              {sortedJobs.length} Job{sortedJobs.length !== 1 ? "s" : ""}
            </Badge>
          ) : undefined
        }
      >
        {jobsLoading ? (
          <div className="space-y-3 py-2">
            <LoadingSkeleton lines={5} className="h-16 w-full" />
          </div>
        ) : jobsError ? (
          <EmptyState
            icon={<History className="w-6 h-6 text-red-400" />}
            title="Failed to Load History"
            description="Could not retrieve processing history. The backend service may be offline."
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : sortedJobs.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6 text-cyan-400" />}
            title="No Processing History"
            description="No video analysis jobs have been submitted yet. Upload a video and start processing to see history here."
            actionLabel="Go to Video Library"
            onAction={() => (window.location.href = ROUTES.VIDEOS)}
          />
        ) : (
          <div className="space-y-2">
            {sortedJobs.map((job: ProcessingJob) => {
              const video = videoMap.get(job.video_id);
              const videoName = video?.filename || job.video_id;

              return (
                <div
                  key={job.job_id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-800/50 hover:bg-[#202B42] transition-all group"
                >
                  {/* Status Icon */}
                  <div className="shrink-0">{statusIcon(job.status)}</div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">
                        {videoName}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] font-mono text-[#9CA3AF] flex-wrap">
                      <span className="text-[#6B7280]">{job.job_id}</span>
                      <span>•</span>
                      <span>Seq: {job.sequence_name}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(job.created_at)}</span>
                      {job.duration_seconds != null && (
                        <>
                          <span>•</span>
                          <span className="text-cyan-400">
                            {job.duration_seconds.toFixed(1)}s
                          </span>
                        </>
                      )}
                    </div>
                    {job.error && (
                      <div className="mt-1 text-[11px] text-red-400 font-mono truncate">
                        Error: {job.error.message}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link to={buildJobDetailsUrl(job.job_id)}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ClipboardList className="w-3 h-3" />}
                      >
                        Audit
                      </Button>
                    </Link>
                    {job.status === "COMPLETED" && (
                      <Link to={buildWorkspaceUrl(job.job_id)}>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<MonitorPlay className="w-3 h-3" />}
                        >
                          Workspace
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};
