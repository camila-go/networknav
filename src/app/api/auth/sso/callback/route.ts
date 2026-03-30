import { NextRequest, NextResponse } from "next/server";
import { getSaml, isSsoEnabled } from "@/lib/saml/config";
import { provisionSamlUser } from "@/lib/saml/provision";
import { createAccessToken, createRefreshToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/security/rateLimit";
import type { SamlUserAttributes } from "@/lib/saml/types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST /api/auth/sso/callback
 *
 * Assertion Consumer Service (ACS). The IdP posts the SAML response
 * here after authenticating the user. We validate the assertion,
 * JIT-provision the user if needed, issue JWT tokens, and redirect
 * to the dashboard or onboarding.
 */
export async function POST(request: NextRequest) {
  if (!isSsoEnabled()) {
    return NextResponse.json(
      { success: false, error: "SSO is not enabled" },
      { status: 404 }
    );
  }

  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimitResult = await checkRateLimit(
    `sso-callback:${ip}`,
    "sso-callback"
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many SSO attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            rateLimitResult.resetTime
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
              : 60
          ),
        },
      }
    );
  }

  try {
    // Parse form-encoded body (SAMLResponse is a standard form field)
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse");

    if (!samlResponse || typeof samlResponse !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing SAMLResponse" },
        { status: 400 }
      );
    }

    // Log the SAMLResponse for debugging signature issues
    const responseXml = Buffer.from(samlResponse, "base64").toString("utf-8");
    // Extract the cert embedded in the assertion (if any)
    const embeddedCertMatch = responseXml.match(
      /<ds:X509Certificate[^>]*>([^<]+)<\/ds:X509Certificate>/
    );
    const configCert = process.env.SAML_IDP_CERT?.trim();
    console.log("SAML callback debug:", {
      hasResponse: true,
      responseLength: samlResponse.length,
      embeddedCert: embeddedCertMatch?.[1]?.substring(0, 60) + "...",
      configCert: configCert?.substring(0, 60) + "...",
      certsMatch: embeddedCertMatch?.[1]?.replace(/\s/g, "") === configCert?.replace(/\s/g, ""),
    });

    // Validate the SAML assertion
    const saml = getSaml();
    const { profile } = await saml.validatePostResponseAsync({
      SAMLResponse: samlResponse,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "SAML assertion validation failed" },
        { status: 401 }
      );
    }

    // Extract user attributes from the assertion
    const attrs = extractAttributes(profile);
    if (!attrs.email) {
      return NextResponse.json(
        { success: false, error: "SAML assertion missing required email attribute" },
        { status: 400 }
      );
    }

    // JIT provision or update the user
    const { user, isNewUser } = await provisionSamlUser(attrs);

    // Issue JWT tokens (same as the login route)
    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role || "user",
    });
    const refreshToken = await createRefreshToken({ userId: user.id });

    // Determine redirect destination
    const redirectTo =
      isNewUser || !user.questionnaireCompleted
        ? `${APP_URL}/onboarding`
        : `${APP_URL}/dashboard`;

    const response = NextResponse.redirect(redirectTo, 302);

    // Set auth cookies (same settings as login route)
    response.cookies.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("SAML callback error:", error);

    const rawMessage =
      error instanceof Error ? error.message : "SAML authentication failed";

    // Show a user-friendly message for config errors instead of
    // leaking internal env var names to the SSO team / end users
    const message = rawMessage.includes("not fully configured")
      ? rawMessage
      : "SSO login failed. Please contact the administrator.";

    // Redirect to login with error instead of returning JSON,
    // since this is a browser redirect flow
    const loginUrl = new URL("/login", APP_URL);
    loginUrl.searchParams.set("error", "sso_failed");
    loginUrl.searchParams.set("message", message);
    return NextResponse.redirect(loginUrl.toString(), 302);
  }
}

/**
 * Extract user attributes from a validated SAML profile.
 *
 * Handles common attribute name formats (friendly names, OID URIs,
 * and ADFS claim URIs).
 */
function extractAttributes(
  profile: Record<string, unknown>
): SamlUserAttributes {
  const get = (
    ...keys: string[]
  ): string | undefined => {
    for (const key of keys) {
      const val = profile[key];
      if (typeof val === "string" && val.trim()) return val.trim();
      // Some IdPs return attributes as arrays
      if (Array.isArray(val) && typeof val[0] === "string" && val[0].trim())
        return val[0].trim();
    }
    return undefined;
  };

  const email =
    get(
      "nameID",
      "email",
      "Email",
      "mail",
      "Mail",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      "urn:oid:0.9.2342.19200300.100.1.3" // inetOrgPerson mail OID
    ) ?? "";

  const displayName = get(
    "displayName",
    "name",
    "Name",
    "cn",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
    "http://schemas.microsoft.com/identity/claims/displayname",
    "urn:oid:2.16.840.1.113730.3.1.241" // displayName OID
  );

  const firstLast = [
    get(
      "firstName",
      "FirstName",
      "givenName",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
      "urn:oid:2.5.4.42"
    ),
    get(
      "lastName",
      "LastName",
      "sn",
      "surname",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
      "urn:oid:2.5.4.4"
    ),
  ]
    .filter(Boolean)
    .join(" ");

  const name = displayName || firstLast || email.split("@")[0];

  const title =
    get(
      "title",
      "Title",
      "jobTitle",
      "position",
      "Position",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/title",
      "urn:oid:2.5.4.12" // title OID
    ) ?? "";

  const company = get(
    "company",
    "Company",
    "organization",
    "o",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/companyname",
    "urn:oid:2.5.4.10" // organizationName OID
  );

  return { email, name, title, company };
}
