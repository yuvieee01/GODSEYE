import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AppHeader } from "./components/layout/AppHeader";
import { AppSidebar } from "./components/layout/AppSidebar";
import { PageContainer } from "./components/layout/PageContainer";

import { OperationsOverviewPage } from "./pages/OperationsOverviewPage";
import { VideoLibraryPage } from "./pages/VideoLibraryPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AnalysisWorkspacePage } from "./pages/AnalysisWorkspacePage";
import { JobDetailsPage } from "./pages/JobDetailsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ROUTES } from "./core/routes";

// Setup TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB] flex flex-col font-sans">
          {/* Workstation Header */}
          <AppHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

          {/* Workstation Body: Sidebar + Main Viewport */}
          <div className="flex-1 flex overflow-hidden">
            <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <PageContainer>
              <Routes>
                <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.OPERATIONS} replace />} />
                <Route path={ROUTES.OPERATIONS} element={<OperationsOverviewPage />} />
                <Route path={ROUTES.VIDEOS} element={<VideoLibraryPage />} />
                <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
                <Route path={ROUTES.WORKSPACE} element={<AnalysisWorkspacePage />} />
                <Route path={ROUTES.WORKSPACE_DEFAULT} element={<AnalysisWorkspacePage />} />
                <Route path={ROUTES.JOB_DETAILS} element={<JobDetailsPage />} />
                <Route path="/jobs" element={<JobDetailsPage />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                <Route path="*" element={<Navigate to={ROUTES.OPERATIONS} replace />} />
              </Routes>
            </PageContainer>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
