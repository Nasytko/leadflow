import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "ORVIX",
    template: "%s | ORVIX",
  },
  description:
    "Lead operations platform. Connect sources, automate decisions, deliver events anywhere.",
  applicationName: "ORVIX",
  openGraph: {
    title: "ORVIX",
    description:
      "Lead operations platform. Connect sources, automate decisions, deliver events anywhere.",
    siteName: "ORVIX",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "ORVIX",
    description:
      "Lead operations platform. Connect sources, automate decisions, deliver events anywhere.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
