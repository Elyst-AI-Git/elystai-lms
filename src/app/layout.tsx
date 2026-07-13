import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import "./lms.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://learn.elystai.com"),
  title: {
    default: "Elyst AI - Accelerator Hub",
    template: "%s | Elyst AI",
  },
  description: "Your AI for Work learning space by Elyst AI.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Elyst AI - Accelerator Hub",
    description: "Your AI for Work learning space.",
    type: "website",
    images: [{ url: "/login-hero.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elyst AI - Accelerator Hub",
    description: "Your AI for Work learning space.",
    images: ["/login-hero.jpg"],
  },
};

export const viewport = {
  themeColor: "#03624c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {children}
      </body>
    </html>
  );
}
