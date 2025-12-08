import { Suspense } from "react";
import { QuestionnaireWizard } from "@/components/questionnaire/wizard";

export const metadata = {
  title: "Complete Your Profile | Jynx",
  description: "Answer a few questions to help us find your perfect leadership matches",
};

export default async function OnboardingPage() {
  // Allow both authenticated and demo users to access the questionnaire
  return (
    <div className="min-h-screen gradient-mesh">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <QuestionnaireWizard />
      </Suspense>
    </div>
  );
}

