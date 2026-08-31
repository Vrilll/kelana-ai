import type { Metadata } from "next";
import { Suspense } from "react";

import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Sign in | KelanaAI",
  description: "Sign in to reach your KelanaAI planner and trip history.",
};

export default function LoginPage() {
  // AuthForm reads ?next= and ?expired=, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
