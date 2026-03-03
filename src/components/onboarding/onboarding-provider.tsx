"use client";

import { OnboardingModal } from "./onboarding-modal";

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <OnboardingModal />
    </>
  );
}
