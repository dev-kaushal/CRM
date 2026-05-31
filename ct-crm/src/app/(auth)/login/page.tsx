import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | CT-CRM",
  description: "Sign in to your CT-CRM dashboard to manage leads, contacts, and sales pipelines.",
};

export default function LoginPage() {
  return <LoginForm />;
}
