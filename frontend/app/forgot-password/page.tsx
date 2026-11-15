import type { Metadata } from "next"
import { AuthPage } from "@/components/admin/auth-page"

export const metadata: Metadata = {
  title: "Password recovery | MIRROR",
  description: "Recover access to the MIRROR administration portal.",
}

export default function ForgotPasswordPage() {
  return <AuthPage mode="forgot" />
}
