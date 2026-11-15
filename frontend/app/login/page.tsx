import type { Metadata } from "next"
import { AuthPage } from "@/components/admin/auth-page"

export const metadata: Metadata = {
  title: "Admin sign in | MIRROR",
  description: "Sign in to the MIRROR administration portal.",
}

export default function LoginPage() {
  return <AuthPage mode="login" />
}
