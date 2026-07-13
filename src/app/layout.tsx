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
    default: "Accelerator Hub by Elyst AI",
    template: "%s | Elyst AI",
  },
  description: "Your AI for Work learning space by Elyst AI.",
  robots: { index: false, follow: false },
  // og:image / twitter:image come from the opengraph-image.png and
  // twitter-image.png file-convention siblings in this directory — Next
  // generates the meta tags automatically, no manual `images` array needed.
  openGraph: {
    title: "Accelerator Hub by Elyst AI",
    description: "Your AI for Work learning space.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Accelerator Hub by Elyst AI",
    description: "Your AI for Work learning space.",
  },
  manifest: "/manifest.webmanifest",
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
