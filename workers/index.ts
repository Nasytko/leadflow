import { prisma } from "@/lib/prisma";
import { createLeadWorker } from "@/lib/queue";
import { processLeadJob, importLeadsForUser } from "@/services/lead.service";
import type { LeadProcessingJobData, ImportLeadsJobData } from "@/lib/queue";
import { writeSystemLog } from "@/lib/system-log";

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

worker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} (${job?.name}) failed:`, err.message);

  const data = job?.data as LeadProcessingJobData | undefined;
  if (data?.webhookEventId) {
    try {
      await prisma.webhookEvent.update({
        where: { id: data.webhookEventId },
        data: {
          status: "failed",
          lastError: err.message,
          lastErrorAt: new Date(),
        },
      });
    } catch {
      // ignore
    }
  }

  await writeSystemLog({
    userId: data?.userId,
    level: "error",
    source: "lead",
    action: `job.${job?.name ?? "unknown"}.failed`,
    message: err.message,
    metadata: {
      jobId: job?.id,
      leadgenId: data?.leadgenId,
      pageId: data?.pageId,
    },
  });
});

process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});

console.log("LeadFlow worker ready");
