import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  History,
  MonitorPlay,
  ClipboardList,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { ROUTES } from "../../core/routes";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen = false, onClose }) => {
  const navItems = [
    {
      to: ROUTES.OPERATIONS,
      label: "Operations Overview",
      subtitle: "System KPIs & Activity",
      icon: LayoutDashboard,
    },
    {
      to: ROUTES.VIDEOS,
      label: "Video Library",
      subtitle: "Ingestion & Assets",
      icon: Video,
    },
    {
      to: ROUTES.HISTORY,
      label: "Processing History",
      subtitle: "Analysed Videos & Results",
      icon: History,
    },
    {
      to: "/workspace/preview",
      label: "Analysis Workspace",
      subtitle: "Optical Telemetry (M4 Preview)",
      icon: MonitorPlay,
    },
    {
      to: "/jobs/audit",
      label: "Processing Jobs",
      subtitle: "Audit Trail (M2 Preview)",
      icon: ClipboardList,
    },
    {
      to: ROUTES.SETTINGS,
      label: "Settings & Optics",
      subtitle: "Calibration & Thresholds",
      icon: SlidersHorizontal,
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#111827] border-r border-[#1F2937] w-64">
      {/* Navigation section */}
      <div className="p-3">
        <div className="text-[10px] font-mono tracking-wider text-[#6B7280] uppercase px-3 py-2 font-semibold">
          Workstation Navigation
        </div>
        <nav className="space-y-1 mt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-md font-medium text-xs transition-all ${
                    isActive
                      ? "bg-cyan-950/50 text-cyan-300 border border-cyan-800/60 shadow-sm"
                      : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1A2234] border border-transparent"
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0 text-cyan-400/90" />
                  <div className="text-left">
                    <div className="leading-tight font-medium">{item.label}</div>
                    <div className="text-[10px] text-[#6B7280] font-mono leading-tight mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#6B7280] opacity-40 shrink-0" />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Visual CV baseline status badge */}
      <div className="mt-auto p-4 border-t border-[#1F2937]">
        <div className="p-3 rounded-lg bg-[#1A2234]/70 border border-[#374151] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#9CA3AF] uppercase font-semibold">
              CV Target
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">UA-DETRAC</span>
          </div>
          <div className="text-[11px] text-[#E5E7EB] font-mono flex items-center justify-between">
            <span>Primary Class:</span>
            <span className="text-cyan-400 font-semibold px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/60">
              Vehicle (Unified)
            </span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] font-mono flex items-center justify-between">
            <span>Baseline Speed:</span>
            <span className="text-amber-400">Uncalibrated (px/s)</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (persistent) */}
      <aside className="hidden md:block shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-50 flex flex-col w-64 max-w-xs shadow-xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
