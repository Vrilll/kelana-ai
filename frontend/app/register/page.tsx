import type { Metadata } from "next";
import { Suspense } from "react";

import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create an account | KelanaAI",
  description: "Create a KelanaAI account to save and revisit your trips.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
