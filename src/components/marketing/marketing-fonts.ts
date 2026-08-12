import { Outfit, Fraunces } from "next/font/google";

/** Loaded only on landing / auth — never applied to the CRM app shell. */
export const marketingSans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const marketingDisplay = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});

export function marketingTypeClass() {
  return `${marketingSans.variable} ${marketingDisplay.variable} marketing-type`;
}
