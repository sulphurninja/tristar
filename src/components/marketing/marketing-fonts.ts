import localFont from "next/font/local";

/** Loaded only on landing / auth — never applied to the CRM app shell. */
export const marketingSans = localFont({
  src: "../../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-outfit",
  display: "swap",
});

export const marketingDisplay = localFont({
  src: "../../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});

export function marketingTypeClass() {
  return `${marketingSans.variable} ${marketingDisplay.variable} marketing-type`;
}
