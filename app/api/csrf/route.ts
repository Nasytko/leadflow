import { generateCsrfToken } from "@/lib/csrf";
import { apiSuccess } from "@/lib/api-helpers";

export async function GET() {
  const token = await generateCsrfToken();
  return apiSuccess({ token });
}
