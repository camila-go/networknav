/**
 * SAML 2.0 Service Provider configuration
 *
 * Uses @node-saml/node-saml as a standalone SAML engine (no Passport.js).
 * The SAML instance is lazy-initialized as a singleton.
 */

import { SAML, type SamlConfig } from "@node-saml/node-saml";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function isSsoEnabled(): boolean {
  return process.env.SSO_ENABLED?.trim() === "true";
}

export function isSsoForced(): boolean {
  return process.env.SSO_FORCE?.trim() === "true";
}

export function getSamlConfig(): SamlConfig {
  const entryPoint = process.env.SAML_ENTRY_POINT;
  const idpCert = process.env.SAML_IDP_CERT;

  if (!entryPoint || !idpCert) {
    throw new Error(
      "SAML SSO is enabled but SAML_ENTRY_POINT and SAML_IDP_CERT are not configured. " +
        "Please set these environment variables."
    );
  }

  return {
    entryPoint,
    issuer:
      process.env.SAML_ISSUER || `${APP_URL}/api/auth/sso/metadata`,
    callbackUrl:
      process.env.SAML_CALLBACK_URL || `${APP_URL}/api/auth/sso/callback`,
    cert: idpCert,
    privateKey: process.env.SAML_SP_KEY || undefined,
    decryptionPvk: process.env.SAML_SP_KEY || undefined,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    // Allow IdP-initiated SSO (no InResponseTo) while validating when present
    validateInResponseTo: "never",
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
