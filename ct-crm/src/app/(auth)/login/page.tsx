import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | CT-CRM",
  description: "Sign in to your CT-CRM dashboard to manage leads, contacts, and sales pipelines.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" />}>
      <LoginForm />
    </Suspense>
  );
}
