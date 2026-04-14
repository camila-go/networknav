/**
 * SAML SSO type definitions
 */

/** User attributes extracted from a validated SAML assertion */
export interface SamlUserAttributes {
  /** Email address (primary identifier) — from NameID or email claim */
  email: string;
  /** Full display name */
  name: string;
  /** Job title */
  title: string;
  /** Organization name (optional) */
  company?: string;
}
