import { redirect } from "next/navigation";

/** Cloud telephony is not part of this product — send users to the dashboard. */
export default function OutgoingCallsPage() {
  redirect("/dashboard");
}
