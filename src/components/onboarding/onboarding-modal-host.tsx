"use client";

import { Suspense } from "react";
import { OnboardingModal } from "./onboarding-modal";

/** Suspense boundary required for OnboardingModal’s useSearchParams. */
export function OnboardingModalHost() {
  return (
    <Suspense fallback={null}>
      <OnboardingModal />
    </Suspense>
  );
}
