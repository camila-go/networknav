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

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("SAML login initiation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate SSO login" },
      { status: 500 }
    );
  }
}
