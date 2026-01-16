import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = {
  title: "Profile | Jynx",
  description: "Manage your Jynx profile",
};

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto space-y-8 px-4 py-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">
            Your Profile
          </h1>
          <p className="text-white/60 mt-1">
            Manage your profile and update your questionnaire responses
          </p>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Profile Information</h2>
            <p className="text-sm text-white/50">
              This information is visible to your matches
            </p>
          </div>
          <Suspense fallback={<div className="h-64 bg-white/5 animate-pulse rounded-lg" />}>
            <ProfileForm />
          </Suspense>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Questionnaire Responses</h2>
            <p className="text-sm text-white/50">
              Update your answers to improve your matches
            </p>
          </div>
          <a
            href="/onboarding"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Retake Questionnaire →
          </a>
        </div>
      </div>
    </div>
  );
}
