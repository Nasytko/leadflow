import { handleLeadImportRequest } from "@/lib/lead-import-api";

export async function POST(request: Request) {
  return handleLeadImportRequest(request);
}
