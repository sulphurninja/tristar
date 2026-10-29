import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

// Self-hosted (via @fontsource-variable) so builds never depend on fetching Google Fonts.
const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
});

const roboto = localFont({
  src: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-roboto",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${roboto.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
