/**
 * Job service querying backend /api/v1/jobs
 */

import { apiClient } from "./apiClient";
import { ProcessingJob, ProcessingJobCreate, JobArtifactsResponse } from "../types/job";
import { JobResults, TrafficAnalyticsSummary } from "../types/telemetry";

export const jobService = {
  async listJobs(statusFilter?: string): Promise<ProcessingJob[]> {
    const params = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
    return apiClient.get<ProcessingJob[]>(`/jobs${params}`);
  },

  async getJob(jobId: string): Promise<ProcessingJob> {
    return apiClient.get<ProcessingJob>(`/jobs/${encodeURIComponent(jobId)}`);
  },

  async getJobResults(jobId: string): Promise<JobResults> {
    return apiClient.get<JobResults>(`/jobs/${encodeURIComponent(jobId)}/results`);
  },

  async getJobArtifacts(jobId: string): Promise<JobArtifactsResponse> {
    return apiClient.get<JobArtifactsResponse>(`/jobs/${encodeURIComponent(jobId)}/artifacts`);
  },

  getAnnotatedVideoUrl(jobId: string): string {
    return apiClient.buildUrl(`/jobs/${encodeURIComponent(jobId)}/annotated-video`);
  },

  async getJobTelemetry(jobId: string): Promise<TrafficAnalyticsSummary> {
    return apiClient.get<TrafficAnalyticsSummary>(`/jobs/${encodeURIComponent(jobId)}/telemetry`);
  },

  async createJob(payload: ProcessingJobCreate): Promise<ProcessingJob> {
    return apiClient.post<ProcessingJob>("/jobs", payload);
  },
};
