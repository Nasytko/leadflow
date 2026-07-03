import { prisma } from "@/lib/prisma";
import { createLeadWorker } from "@/lib/queue";
import { processLeadJob } from "@/services/lead.service";
import { importMetaLeadsForUser } from "@/services/lead-import.service";
import type { LeadProcessingJobData, ImportLeadsJobData } from "@/lib/queue";
import { writeSystemLog } from "@/lib/system-log";

console.log("ORVIX worker starting...");

const worker = createLeadWorker(async (job) => {
  if (job.name === "process-lead" || job.name === "retry-telegram") {
    await processLeadJob(job.data as LeadProcessingJobData);
  } else if (job.name === "import-leads") {
    const data = job.data as ImportLeadsJobData;
    const result = await importMetaLeadsForUser(data.userId, data.sendToTelegram);
    if (!result.success) {
      throw new Error(result.message);
    }
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

async function shutdown(signal: string) {
  console.log(`Shutting down worker (${signal})...`);
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("ORVIX worker ready");
