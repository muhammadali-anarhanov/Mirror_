import type { Metadata } from "next"
import { AuthPage } from "@/components/admin/auth-page"

export const metadata: Metadata = {
  title: "Reset password | MIRROR",
  description: "Set a new password for the MIRROR administration portal.",
}

export default function ResetPasswordPage() {
  return <AuthPage mode="reset" />
}
