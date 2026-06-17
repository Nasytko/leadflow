import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import {
  checkAuthRateLimit,
  parseCredentialsEmail,
  rateLimitedResponse,
} from "@/lib/security-rate-limit";

const { GET, POST: nextAuthPost } = handlers;

export { GET };

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes("/callback/credentials")) {
    const email = await parseCredentialsEmail(request);
    const limit = await checkAuthRateLimit({
      action: "login",
      request,
      email,
    });
    if (!limit.allowed) {
      return rateLimitedResponse(limit.retryAfterSeconds);
    }
  }

  return nextAuthPost(request);
}
