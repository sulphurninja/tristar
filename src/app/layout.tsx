import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tristar Realtors — Internal CRM",
    template: "%s · Tristar Realtors",
  },
  description:
    "Tristar Realtors CRM — manage projects, leads, site visits, brokers and channel partners across every Tristar development from one focused workspace.",
  keywords: [
    "Tristar Realtors",
    "real estate CRM",
    "property management software",
    "lead management",
    "site visit scheduler",
    "channel partner CRM",
    "builder CRM",
  ],
  authors: [{ name: "Tristar Realtors" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3020"),
  openGraph: {
    type: "website",
    title: "Tristar Realtors CRM",
    description:
      "Manage projects, leads, site visits and channel partners across the Tristar group of real estate developments.",
    siteName: "Tristar Realtors",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tristar Realtors CRM",
  },
  icons: {
    icon: "/tristar-logo.png",
    shortcut: "/tristar-logo.png",
    apple: "/tristar-logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
