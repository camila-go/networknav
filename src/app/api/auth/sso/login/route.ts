import { NextResponse } from "next/server";
import { getSaml, isSsoEnabled } from "@/lib/saml/config";

/**
 * GET /api/auth/sso/login
 *
 * SP-initiated SAML login. Generates an AuthnRequest and redirects
 * the browser to the IdP's SSO URL.
 */
export async function GET() {
  if (!isSsoEnabled()) {
    return NextResponse.json(
      { success: false, error: "SSO is not enabled" },
      { status: 404 }
    );
  }

  try {
    const saml = getSaml();
    const loginUrl = await saml.getAuthorizeUrlAsync("", undefined, {});

    // Log the redirect URL (truncated) for debugging SP-initiated flow issues
    const url = new URL(loginUrl);
    console.log(
      "SAML SP-initiated login: redirecting to",
      url.origin + url.pathname,
      "| SAMLRequest length:",
      url.searchParams.get("SAMLRequest")?.length ?? 0
    );

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("SAML login initiation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate SSO login" },
      { status: 500 }
    );
  }
}
