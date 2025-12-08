import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Profile | NetworkNav",
  description: "Manage your NetworkNav profile",
};

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">
          Your Profile
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile and update your questionnaire responses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            This information is visible to your matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-64 shimmer rounded-lg" />}>
            <ProfileForm />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire Responses</CardTitle>
          <CardDescription>
            Update your answers to improve your matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/onboarding"
            className="text-primary hover:underline font-medium"
          >
            Retake Questionnaire →
          </a>
        </CardContent>
      </Card>
    </div>
  );
}

