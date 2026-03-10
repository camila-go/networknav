import { NextResponse } from "next/server";
import { getSaml, getSpCert, isSsoEnabled } from "@/lib/saml/config";

/**
 * GET /api/auth/sso/metadata
 *
 * Returns SAML SP metadata XML. Share this with the IdP team so they
 * can configure the SP connection on their side.
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
    const spCert = getSpCert();

    const metadata = saml.generateServiceProviderMetadata(
      null, // decryption cert (not needed unless encrypted assertions)
      spCert ?? null // signing cert
    );

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
