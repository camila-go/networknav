import { describe, expect, it } from "vitest";
import { resolvedProfilePhotoUrlForRow } from "./canonical-avatar-fallback";
import { LISA_LUCAS_AVATAR_PUBLIC_URL, LISA_LUCAS_USER_PROFILE_ID } from "./lisa-lucas";
import {
  CAMILA_GONZALEZ_AVATAR_PUBLIC_URL,
  CAMILA_GONZALEZ_USER_PROFILE_ID,
} from "./camila-gonzalez";

describe("resolvedProfilePhotoUrlForRow", () => {
  it("returns trimmed DB URL when present", () => {
    expect(
      resolvedProfilePhotoUrlForRow("any-id", "  https://x.test/a.png  ")
    ).toBe("https://x.test/a.png");
  });

  it("returns Camila fallback when id matches and photo empty", () => {
    expect(
      resolvedProfilePhotoUrlForRow(CAMILA_GONZALEZ_USER_PROFILE_ID, null)
    ).toBe(CAMILA_GONZALEZ_AVATAR_PUBLIC_URL);
  });

  it("returns Lisa fallback when id matches and photo empty", () => {
    expect(
      resolvedProfilePhotoUrlForRow(LISA_LUCAS_USER_PROFILE_ID, "  ")
    ).toBe(LISA_LUCAS_AVATAR_PUBLIC_URL);
  });

  it("returns empty string for unknown user with no photo", () => {
    expect(resolvedProfilePhotoUrlForRow("other-uuid", null)).toBe("");
  });
});
