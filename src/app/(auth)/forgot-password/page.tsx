import { redirect } from "next/navigation";

/** Password reset is not implemented — send users back to login. */
export default function ForgotPasswordPage() {
  redirect("/login");
}
