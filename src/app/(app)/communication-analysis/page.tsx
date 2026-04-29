import { UpgradeNotice } from "@/components/shared/UpgradeNotice";

export default function CommunicationAnalysisPage() {
  return (
    <UpgradeNotice
      title="Communication Analysis"
      description="Analyse what your team says on calls, WhatsApp and email — sentiment, talk-time, objections and follow-up adherence."
      features={[
        "Per-user call quality scoring with reason categories",
        "WhatsApp conversation transcripts with key-phrase highlights",
        "Email open/click reporting per template",
        "AI-generated coaching tips for managers",
      ]}
    />
  );
}
