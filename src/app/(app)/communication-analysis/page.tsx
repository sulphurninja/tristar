import { redirect } from "next/navigation";

/** Communication analysis requires telephony integrations not in this product. */
export default function CommunicationAnalysisPage() {
  redirect("/dashboard");
}
