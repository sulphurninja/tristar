import { LandingPage } from "@/components/marketing/LandingPage";
import { marketingTypeClass } from "@/components/marketing/marketing-fonts";

export default function HomePage() {
  return (
    <div className={marketingTypeClass()}>
      <LandingPage />
    </div>
  );
}
