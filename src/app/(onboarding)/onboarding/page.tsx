import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { QuestionnaireWizard } from "@/components/questionnaire/wizard";

export const metadata = {
  title: "Complete Your Profile | NetworkNav",
  description: "Answer a few questions to help us find your perfect leadership matches",
};

export default async function OnboardingPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

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

