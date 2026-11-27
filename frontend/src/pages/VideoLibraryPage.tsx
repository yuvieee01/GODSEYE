import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Video,
  UploadCloud,
  Play,
  RotateCw,
  AlertTriangle,
  Calendar,
  History,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/feedback/EmptyState";
import { LoadingSkeleton } from "../components/feedback/LoadingSkeleton";
import { VideoUploader } from "../components/video/VideoUploader";
import { ProcessingConfigModal } from "../components/job/ProcessingConfigModal";
import { videoService } from "../services/videoService";
import { VideoMetadata } from "../types/video";
import { formatBytes, formatDuration } from "../core/validation";
import { APP_CONFIG } from "../core/config";
import { ROUTES } from "../core/routes";

export const VideoLibraryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [selectedVideoForProcessing, setSelectedVideoForProcessing] =
    useState<VideoMetadata | null>(null);

  // TanStack Query for live video catalog
  const {
    data: videos,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["videos"],
    queryFn: () => videoService.listVideos(),
    staleTime: 5000,
  });

  const handleUploadSuccess = () => {
    // Invalidate and refetch videos query so new video appears instantly
    queryClient.invalidateQueries({ queryKey: ["videos"] });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        category="Video Management"
        title="Video Library & Ingestion"
        subtitle="Catalog of raw traffic camera video assets and streamed multipart ingestion"
        actions={
          <div className="flex items-center gap-2">
            <Link to={ROUTES.HISTORY}>
              <Button
                variant="outline"
                size="sm"
                icon={<History className="w-3.5 h-3.5 text-cyan-400" />}
              >
                View History
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              icon={<RotateCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<UploadCloud className="w-4 h-4" />}
              onClick={() => setIsUploaderOpen(true)}
            >
              Upload Video Stream
            </Button>
          </div>
        }
      />

      {/* Upload Modal */}
      {isUploaderOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <VideoUploader
            onUploadSuccess={handleUploadSuccess}
            onClose={() => setIsUploaderOpen(false)}
          />
        </div>
      )}

      {/* Processing Configuration Modal */}
      {selectedVideoForProcessing && (
        <ProcessingConfigModal
          video={selectedVideoForProcessing}
          onClose={() => setSelectedVideoForProcessing(null)}
        />
      )}

      {/* Development Fixture Spotlight */}
      {APP_CONFIG.isDev && (
        <SectionCard
          title="Verified Benchmark Sequence"
          description="Deterministic UA-DETRAC sequence available in development environment"
          badge={<Badge variant="cyan" size="sm">BENCHMARK FIXTURE</Badge>}
        >
          <div className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#F9FAFB]">
                    {APP_CONFIG.sampleSequence.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                    VERIFIED CLIP
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1">
                  {APP_CONFIG.sampleSequence.resolution} • {APP_CONFIG.sampleSequence.frames} frames @ {APP_CONFIG.sampleSequence.fps} FPS ({APP_CONFIG.sampleSequence.durationSeconds}s) • Night Traffic
                </p>
                <div className="text-[11px] text-[#6B7280] mt-1">
                  Path: <span className="text-cyan-400/90">{APP_CONFIG.sampleSequence.relativePath}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                icon={<UploadCloud className="w-3.5 h-3.5 text-cyan-400" />}
                onClick={() => setIsUploaderOpen(true)}
              >
                Upload to Backend
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Ingested Video Assets Catalog */}
      <SectionCard
        title="Ingested Video Assets"
        description="Videos stored in the backend storage repository and verified by OpenCV"
        badge={
          videos && videos.length > 0 ? (
            <Badge variant="cyan" size="sm">
              {videos.length} Asset{videos.length !== 1 ? "s" : ""}
            </Badge>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-3 py-2">
            <LoadingSkeleton lines={4} className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/50 flex items-start justify-between gap-3 font-mono text-xs text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Failed to load video catalog:</span>
                <p className="mt-1 text-[#D1D5DB]">
                  {(error as any)?.message || "Network error. Backend service may be offline."}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !videos || videos.length === 0 ? (
          <EmptyState
            icon={<Video className="w-6 h-6 text-cyan-400" />}
            title="No Ingested Video Assets"
            description="No videos have been uploaded yet. Upload a surveillance clip using streamed multipart ingestion to begin traffic analytics."
            actionLabel="Upload Video Stream"
            onAction={() => setIsUploaderOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#1F2937] text-[#9CA3AF] text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">Video Filename & ID</th>
                  <th className="py-3 px-3">Dimensions & FPS</th>
                  <th className="py-3 px-3">Duration & Frames</th>
                  <th className="py-3 px-3">File Size</th>
                  <th className="py-3 px-3">Uploaded</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/60">
                {videos.map((vid: VideoMetadata) => (
                  <tr
                    key={vid.video_id}
                    className="hover:bg-[#1A2234]/60 transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white text-xs">
                            {vid.filename}
                          </div>
                          <div className="text-[10px] text-[#6B7280]">
                            {vid.video_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#D1D5DB]">
                      {vid.width && vid.height ? (
                        <span>
                          {vid.width}x{vid.height}{" "}
                          <span className="text-[#9CA3AF]">@ {vid.fps} FPS</span>
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[#D1D5DB]">
                      <div>{formatDuration(vid.duration_seconds)}</div>
                      <div className="text-[10px] text-[#6B7280]">
                        {vid.frame_count ? `${vid.frame_count} frames` : "--"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#D1D5DB]">
                      {formatBytes(vid.file_size_bytes)}
                    </td>
                    <td className="py-3 px-3 text-[#9CA3AF] text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#6B7280]" />
                        <span>{new Date(vid.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        {new Date(vid.uploaded_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedVideoForProcessing(vid)}
                        icon={<Play className="w-3 h-3 text-cyan-400" />}
                      >
                        Process Video
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};
