import { NextRequest, NextResponse } from "next/server";
import { getSaml, getSamlConfig, isSsoEnabled } from "@/lib/saml/config";
import { inflateRaw } from "zlib";
import { promisify } from "util";

const inflateRawAsync = promisify(inflateRaw);

/**
 * GET /api/auth/sso/debug
 *
 * Diagnostic endpoint that generates the same AuthnRequest as the login
 * route but returns the decoded XML and redirect URL instead of redirecting.
 * Useful for debugging SP-initiated flow issues with the IdP.
 *
 * Protected by a query param secret in production.
 */
export async function GET(request: NextRequest) {
  if (!isSsoEnabled()) {
    return NextResponse.json(
      { success: false, error: "SSO is not enabled" },
      { status: 404 }
    );
  }

  // In production, require a secret query param to prevent info leakage
  if (process.env.NODE_ENV === "production") {
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== process.env.SSO_DEBUG_SECRET) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
  }

  try {
    const saml = getSaml();
    const config = getSamlConfig();
    const loginUrl = await saml.getAuthorizeUrlAsync("", undefined, {});

    // Extract and decode the SAMLRequest from the redirect URL
    const url = new URL(loginUrl);
    const samlRequestParam = url.searchParams.get("SAMLRequest");

    let decodedXml = "(could not decode)";
    if (samlRequestParam) {
      try {
        const compressed = Buffer.from(samlRequestParam, "base64");
        const inflated = await inflateRawAsync(compressed);
        decodedXml = inflated.toString("utf-8");
      } catch {
        decodedXml = "(inflate failed — trying raw base64 decode)";
        try {
          decodedXml = Buffer.from(samlRequestParam, "base64").toString("utf-8");
        } catch {
          decodedXml = "(could not decode)";
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        redirectUrl: loginUrl,
        redirectUrlLength: loginUrl.length,
        samlRequestXml: decodedXml,
        config: {
          issuer: config.issuer,
          entryPoint: config.entryPoint,
          callbackUrl: config.callbackUrl,
          signatureAlgorithm: config.signatureAlgorithm,
          wantAssertionsSigned: config.wantAssertionsSigned,
          wantAuthnResponseSigned: config.wantAuthnResponseSigned,
          disableRequestedAuthnContext: config.disableRequestedAuthnContext,
          allowCreate: config.allowCreate,
          hasPrivateKey: !!config.privateKey,
          validateInResponseTo: config.validateInResponseTo,
        },
      },
    });
  } catch (error) {
    console.error("SAML debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate debug info",
      },
      { status: 500 }
    );
  }
}
