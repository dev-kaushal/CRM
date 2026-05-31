import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account | CT-CRM",
  description: "Create your CT-CRM account to start managing your sales pipeline and customer relationships.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
