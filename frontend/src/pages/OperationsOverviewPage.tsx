import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Video,
  MonitorPlay,
  Database,
  ArrowRight,
  FileCode,
  History,
} from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import { SectionCard } from "../components/common/SectionCard";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { useHealth } from "../hooks/useHealth";
import { APP_CONFIG } from "../core/config";
import { ROUTES } from "../core/routes";

export const OperationsOverviewPage: React.FC = () => {
  const { mode, health } = useHealth();

  return (
    <div className="space-y-6">
      <PageHeader
        category="Traffic Operations Center"
        title="Operations Overview"
        subtitle="Real-time surveillance health, computer vision pipeline telemetry, and sequence workstation"
        actions={
          <div className="flex items-center gap-2">
            <Link to={ROUTES.VIDEOS}>
              <Button variant="primary" size="sm" icon={<Video className="w-3.5 h-3.5" />}>
                Video Library
              </Button>
            </Link>
          </div>
        }
      />

      {/* Top Telemetry / Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Backend Status Card */}
        <Card className="p-4 border-[#1F2937] bg-[#111827]">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>FastAPI Backend</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span
              className={`text-xl font-bold font-mono ${
                mode === "online" ? "text-emerald-400" : mode === "checking" ? "text-cyan-400" : "text-red-400"
              }`}
            >
              {mode === "online" ? "OPERATIONAL" : mode === "checking" ? "CONNECTING..." : "UNAVAILABLE"}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#6B7280] flex items-center justify-between">
            <span>API: {mode === "online" ? "Healthy" : "Offline"}</span>
            <span>DB: {health?.database_connected ? "Verified OK" : health?.database_dialect || "sqlite"}</span>
          </div>
        </Card>

        {/* CV Pipeline Engine Card */}
        <Card className="p-4 border-[#1F2937] bg-[#111827]">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Pipeline Architecture</span>
            <Badge variant="outline" size="sm">SPEC ONLY</Badge>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-[#F9FAFB]">
            YOLO11n + ByteTrack
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#6B7280]">
            Target CV stack • Inference loaded per job
          </div>
        </Card>

        {/* Primary Classification Model */}
        <Card className="p-4 border-[#1F2937] bg-[#111827]">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Class Evaluation</span>
            <Badge variant="outline" size="sm">FROZEN</Badge>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-cyan-400">Unified Vehicle</span>
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#6B7280]">
            Ground Truth: Class-agnostic vehicle
          </div>
        </Card>

        {/* Speed Calibration State */}
        <Card className="p-4 border-[#1F2937] bg-[#111827]">
          <div className="flex items-center justify-between text-[#9CA3AF] text-xs font-mono">
            <span>Speed Telemetry</span>
            <Badge variant="amber" size="sm">UNCALIBRATED</Badge>
          </div>
          <div className="mt-2.5 text-xl font-bold font-mono text-amber-400">
            Uncalibrated (px/s)
          </div>
          <div className="mt-2 text-[11px] font-mono text-[#6B7280]">
            Pending camera homography (speed_kmh: null)
          </div>
        </Card>
      </div>

      {/* Main Grid: Workstation Navigation & Development Sample */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Navigation to Workstation Views */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Workstation Navigation"
            description="Jump directly to core computer vision analytical interfaces"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                to={ROUTES.VIDEOS}
                className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-500/70 hover:bg-[#202B42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Video className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-sm text-[#F9FAFB] group-hover:text-cyan-300">
                      Video Library
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                  Ingest and inspect raw traffic camera video assets. Review resolutions, frame rates, and durations.
                </p>
              </Link>

              <Link
                to="/workspace/preview"
                className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-500/70 hover:bg-[#202B42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <MonitorPlay className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-sm text-[#F9FAFB] group-hover:text-cyan-300">
                      Analysis Workspace
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                  Flagship 65/35 dual-pane workstation: video evidence player with synchronized tripwires, ROIs, and flow curves.
                </p>
              </Link>

              <Link
                to="/jobs/audit"
                className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-500/70 hover:bg-[#202B42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-sm text-[#F9FAFB] group-hover:text-cyan-300">
                      Processing Jobs
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                  Asynchronous worker queue monitoring, state transitions (QUEUED to COMPLETED), and raw telemetry downloads.
                </p>
              </Link>

              <Link
                to={ROUTES.HISTORY}
                className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-500/70 hover:bg-[#202B42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <History className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-sm text-[#F9FAFB] group-hover:text-cyan-300">
                      Processing History
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                  Complete timeline of all analysed videos with clickable links to workspace and job audit trails.
                </p>
              </Link>

              <Link
                to={ROUTES.SETTINGS}
                className="p-4 rounded-lg bg-[#1A2234] border border-[#374151] hover:border-cyan-500/70 hover:bg-[#202B42] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-5 h-5 text-cyan-400" />
                    <span className="font-semibold text-sm text-[#F9FAFB] group-hover:text-cyan-300">
                      Settings & Optics
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed">
                  Inspect detection confidence thresholds, ByteTrack buffer parameters, and homography calibration status.
                </p>
              </Link>
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Development Sample Fixture Card */}
        {APP_CONFIG.isDev && (
          <div className="space-y-6">
            <SectionCard
              title="Development Fixture"
              description="Verified benchmark clip for visual testing"
              badge={
                <Badge variant="cyan" size="sm">
                  DEV ONLY
                </Badge>
              }
            >
              <div className="space-y-3.5">
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1F2937] font-mono text-xs space-y-1.5">
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Sequence:</span>
                    <span className="text-cyan-400 font-bold">{APP_CONFIG.sampleSequence.name}</span>
                  </div>
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Resolution:</span>
                    <span className="text-[#F9FAFB]">{APP_CONFIG.sampleSequence.resolution}</span>
                  </div>
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Frames / FPS:</span>
                    <span className="text-[#F9FAFB]">{APP_CONFIG.sampleSequence.frames}f @ {APP_CONFIG.sampleSequence.fps} FPS</span>
                  </div>
                  <div className="flex justify-between text-[#9CA3AF]">
                    <span>Duration:</span>
                    <span className="text-[#F9FAFB]">{APP_CONFIG.sampleSequence.durationSeconds}s</span>
                  </div>
                  <div className="flex justify-between text-[#9CA3AF] pt-1 border-t border-[#1F2937] text-[10px]">
                    <span>Relative Path:</span>
                    <span className="text-emerald-400 truncate max-w-[170px]" title={APP_CONFIG.sampleSequence.relativePath}>
                      {APP_CONFIG.sampleSequence.relativePath}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  This verified 75-frame UA-DETRAC night sequence provides deterministic visual data for local testing. It is strictly gated under development mode and excluded from production builds.
                </p>

                <div className="p-2.5 rounded bg-[#1A2234] border border-[#374151] text-[11px] font-mono text-[#9CA3AF] text-center">
                  <span className="text-cyan-400 font-semibold">Milestone 3 Workflow:</span> Sample will follow standard backend ingestion (<code className="text-emerald-400">POST /api/v1/videos</code>) and job submission.
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
};
