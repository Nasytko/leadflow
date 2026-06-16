import { createLeadWorker } from "@/lib/queue";
import { processLeadJob, importLeadsForUser } from "@/services/lead.service";
import type { LeadProcessingJobData, ImportLeadsJobData } from "@/lib/queue";

console.log("LeadFlow worker starting...");

const worker = createLeadWorker(async (job) => {
  if (job.name === "process-lead" || job.name === "retry-telegram") {
    await processLeadJob(job.data as LeadProcessingJobData);
  } else if (job.name === "import-leads") {
    const data = job.data as ImportLeadsJobData;
    await importLeadsForUser(data.userId, data.sendToTelegram);
  }
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});

console.log("LeadFlow worker ready");
