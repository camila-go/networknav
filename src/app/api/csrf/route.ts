import { getCsrfTokenHandler } from "@/lib/security/csrf";

/**
 * GET /api/csrf
 * Returns a CSRF token for use in subsequent state-changing requests.
 * Call this endpoint on app load or before making POST/PUT/DELETE requests.
 */
export async function GET() {
  return getCsrfTokenHandler();
}

