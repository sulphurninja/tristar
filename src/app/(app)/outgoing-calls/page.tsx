import { UpgradeNotice } from "@/components/shared/UpgradeNotice";

export default function OutgoingCallsPage() {
  return (
    <UpgradeNotice
      title="Cloud Telephony &amp; Outgoing Calls"
      description="Place and record outbound calls to leads and brokers directly from the CRM — with auto-logging on the timeline."
      features={[
        "One-click dial from the lead detail panel",
        "Automatic call recording attached to the lead",
        "Inbound IVR routing to the right team",
        "Live AI transcription and summaries",
      ]}
    />
  );
}
