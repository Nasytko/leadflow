import { Queue, Worker, type JobsOptions } from "bullmq";
import { getRedisConnectionOptions } from "./redis";
import { safeQueueJobId } from "@/lib/safe-toast-id";

export const QUEUE_NAMES = {
  LEAD_PROCESSING: "lead-processing",
} as const;

export type LeadProcessingJobData = {
  leadgenId: string;
  pageId: string;
  formId?: string;
  webhookEventId?: string;
  userId?: string;
  retryDeliveryLogId?: string;
};

export type ImportLeadsJobData = {
  userId: string;
  sendToTelegram: boolean;
};

let leadQueue: Queue | null = null;

export async function getLeadQueue(): Promise<Queue> {
  if (!leadQueue) {
    leadQueue = new Queue(QUEUE_NAMES.LEAD_PROCESSING, {
      connection: getRedisConnectionOptions(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    });
  }
  return leadQueue;
}

export async function enqueueLeadProcessing(
  data: LeadProcessingJobData,
  options?: JobsOptions
) {
  const queue = await getLeadQueue();
  const jobId = safeQueueJobId(`lead_${data.pageId}_${data.leadgenId}`);
  return queue.add("process-lead", data, {
    ...options,
    jobId,
  });
}

export async function enqueueLeadRetry(
  data: LeadProcessingJobData,
  delayMs: number
) {
  const queue = await getLeadQueue();
  const jobId = data.retryDeliveryLogId
    ? safeQueueJobId(`retry_${data.retryDeliveryLogId}`)
    : safeQueueJobId(`retry_${data.pageId}_${data.leadgenId}_${delayMs}`);
  return queue.add("retry-telegram", data, { delay: delayMs, jobId });
}

export async function enqueueImportLeads(data: ImportLeadsJobData) {
  const queue = await getLeadQueue();
  return queue.add("import-leads", data, {
    jobId: safeQueueJobId(`import_${data.userId}`),
  });
}

export function createLeadWorker(
  processor: (job: { name: string; data: LeadProcessingJobData | ImportLeadsJobData }) => Promise<void>
) {
  return new Worker(
    QUEUE_NAMES.LEAD_PROCESSING,
    async (job) => {
      await processor({
        name: job.name,
        data: job.data as LeadProcessingJobData | ImportLeadsJobData,
      });
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 5,
    }
  );
}
