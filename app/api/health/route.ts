import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { runDeploymentHealthChecks } from "@/lib/meta-deployment-health";

export async function GET() {
  const checks: Record<string, "ok" | "error" | "warning"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const deployment = runDeploymentHealthChecks();
  checks.metaPlatform = deployment.status === "ok" ? "ok" : deployment.status === "warning" ? "warning" : "error";

  const values = Object.values(checks);
  const healthy = values.every((v) => v === "ok");
  const degraded = values.some((v) => v === "error");

  return NextResponse.json(
    {
      status: healthy ? "ok" : degraded ? "degraded" : "warning",
      checks,
      deployment: {
        status: deployment.status,
        failed: deployment.checks.filter((c) => c.status !== "ok").map((c) => c.id),
      },
      checkedAt: new Date().toISOString(),
    },
    { status: degraded ? 503 : 200 }
  );
}
