/**
 * Map Strategic Education business-unit codes to display names.
 *
 * The IdP sends raw codes (SS001, CU001, SU001) as the SAML `company`
 * attribute. These must never reach the UI. Apply this helper at:
 * - SAML ingest (write path), so new/returning users get clean data
 * - API response boundaries (read path), as a safety net for legacy
 *   data that hasn't been backfilled yet
 */

const COMPANY_CODE_MAP: Record<string, string> = {
  SS001: "Strategic Education, Inc.",
  SS01: "Strategic Education, Inc.",
  CU001: "Capella University",
  CU01: "Capella University",
  SU001: "Strayer University",
  SU01: "Strayer University",
};

export const COMPANY_CODES = Object.keys(COMPANY_CODE_MAP);

export function normalizeCompany<T extends string | null | undefined>(
  raw: T
): T {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const mapped = COMPANY_CODE_MAP[trimmed.toUpperCase()];
  return (mapped ?? trimmed) as T;
}
