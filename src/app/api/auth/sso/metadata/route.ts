import { NextResponse } from "next/server";
import { generateSpMetadataXml, isSsoEnabled } from "@/lib/saml/config";

/**
 * GET /api/auth/sso/metadata
 *
 * Returns SAML SP metadata XML. Share this with the IdP team so they
 * can configure the SP connection on their side.
 *
 * This endpoint works without IdP configuration (SAML_ENTRY_POINT /
 * SAML_IDP_CERT) so metadata can be exchanged before the IdP is set up.
 */
export async function GET() {
  if (!isSsoEnabled()) {
    return NextResponse.json(
      { success: false, error: "SSO is not enabled" },
      { status: 404 }
    );
  }

  try {
    const metadata = generateSpMetadataXml();

    return new NextResponse(metadata, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400", // cache 24h
      },
    });
  } catch (error) {
    console.error("SAML metadata generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate SAML metadata" },
      { status: 500 }
    );
  }
}
