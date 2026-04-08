/**
 * SAML 2.0 Service Provider configuration
 *
 * Uses @node-saml/node-saml as a standalone SAML engine (no Passport.js).
 * The SAML instance is lazy-initialized as a singleton.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { SAML, ValidateInResponseTo, type SamlConfig } from "@node-saml/node-saml";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Strategic Education prod IdP (PingFederate). */
export const STRATEGIC_ED_SSO_ENTRY_POINT =
  "https://sso.strategiced.com/idp/SSO.saml2";

/** Strategic Education dev IdP (PingFederate). */
export const STRATEGIC_ED_DEV_SSO_ENTRY_POINT =
  "https://devsso.strategiced.com/idp/SSO.saml2";

/** Optional local PEM (gitignored `certs/` is typical). */
const DEFAULT_IDP_CERT_FILE = join(
  process.cwd(),
  "certs",
  "strategic-ed-prod-idp.pem"
);

export function isSsoEnabled(): boolean {
  return process.env.SSO_ENABLED?.trim() === "true";
}

export function isSsoForced(): boolean {
  return process.env.SSO_FORCE?.trim() === "true";
}

function normalizePemFromEnv(value: string): string {
  const t = value.trim();
  return t.includes("\\n") ? t.replace(/\\n/g, "\n") : t;
}

function resolveIdpSigningCert(): string {
  const fromEnv = process.env.SAML_IDP_CERT?.trim();
  if (fromEnv) {
    return normalizePemFromEnv(fromEnv);
  }
  const pathFromEnv = process.env.SAML_IDP_CERT_PATH?.trim();
  const pathToRead = pathFromEnv || DEFAULT_IDP_CERT_FILE;
  if (existsSync(pathToRead)) {
    return readFileSync(pathToRead, "utf8").trim();
  }
  throw new Error(
    "SSO is not fully configured: IdP certificate is missing. " +
      "Set SAML_IDP_CERT (e.g. from Vercel), SAML_IDP_CERT_PATH, or place PEM at " +
      "`certs/strategic-ed-dev-idp.pem`. Please contact the administrator."
  );
}

export function getSamlConfig(): SamlConfig {
  const entryPointFromEnv = process.env.SAML_ENTRY_POINT?.trim();
  const entryPoint =
    entryPointFromEnv ||
    (isSsoEnabled() ? STRATEGIC_ED_SSO_ENTRY_POINT : "");

  if (!entryPoint) {
    throw new Error(
      "SSO is not fully configured: IdP entry point is missing. " +
        "Set SAML_ENTRY_POINT or enable SSO (defaults to Strategic Education dev IdP when SSO_ENABLED=true)."
    );
  }

  const idpCert = resolveIdpSigningCert();

  return {
    entryPoint,
    issuer:
      process.env.SAML_ISSUER || `${APP_URL}/api/auth/sso/metadata`,
    callbackUrl:
      process.env.SAML_CALLBACK_URL || `${APP_URL}/api/auth/sso/callback`,
    idpCert,
    privateKey: process.env.SAML_SP_KEY || undefined,
    decryptionPvk: process.env.SAML_SP_KEY || undefined,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    // PingFederate may not support the default PasswordProtectedTransport context
    disableRequestedAuthnContext: true,
    // Enterprise IdPs reject AllowCreate=true (they don't create accounts from SP requests)
    allowCreate: false,
    // Allow IdP-initiated SSO (no InResponseTo) while validating when present
    validateInResponseTo: ValidateInResponseTo.never,
  };
}

let samlInstance: SAML | null = null;

/** Get the singleton SAML instance (lazy-initialized) */
export function getSaml(): SAML {
  if (!samlInstance) {
    samlInstance = new SAML(getSamlConfig());
  }
  return samlInstance;
}

/**
 * Generate SP metadata XML without requiring IdP config.
 * This allows sharing metadata with the IdP team before they provide
 * their entry point and signing certificate.
 */
export function generateSpMetadataXml(): string {
  const entityId =
    process.env.SAML_ISSUER || `${APP_URL}/api/auth/sso/metadata`;
  const acsUrl =
    process.env.SAML_CALLBACK_URL || `${APP_URL}/api/auth/sso/callback`;
  const spCert = getSpCert();

  let keyDescriptor = "";
  if (spCert) {
    const certBody = spCert
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s+/g, "");
    keyDescriptor = `
    <KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>${certBody}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>`;
  }

  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="${spCert ? "true" : "false"}"
                   WantAssertionsSigned="true"
                   protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">${keyDescriptor}
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AttributeConsumingService index="1" isDefault="true">
      <ServiceName xml:lang="en">NetworkNav</ServiceName>
      <RequestedAttribute FriendlyName="mail" Name="mail" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="true" />
      <RequestedAttribute FriendlyName="name" Name="name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="true" />
      <RequestedAttribute FriendlyName="title" Name="title" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="false" />
      <RequestedAttribute FriendlyName="company" Name="company" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic" isRequired="false" />
    </AttributeConsumingService>
    <AssertionConsumerService index="1"
                              isDefault="true"
                              Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="${acsUrl}" />
  </SPSSODescriptor>
</EntityDescriptor>`;
}

/** Get the SP signing certificate (PEM) if configured, for metadata generation */
export function getSpCert(): string | undefined {
  return process.env.SAML_SP_CERT || undefined;
}
