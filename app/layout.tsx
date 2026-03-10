import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import RegisterSW from "@/app/components/RegisterSW";
import "antd/dist/reset.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL("https://theartcher.github.io/StratagemRandomizer"),
  title: "Stratagem Randomizer",
  description:
    "Randomly pick 4 Helldivers 2 stratagems from your unlocked warbonds.",
  keywords: [
    "Helldivers 2",
    "Stratagem Randomizer",
    "stratagems",
    "loadout",
    "randomizer",
    "warbonds",
  ],
  authors: [{ name: "theartcher", url: "https://github.com/theartcher" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://theartcher.github.io/StratagemRandomizer",
    title: "Stratagem Randomizer",
    description:
      "Randomly pick 4 Helldivers 2 stratagems from your unlocked warbonds.",
    siteName: "Stratagem Randomizer",
    images: [
      {
        url: "icons/pwa-512.png",
        width: 512,
        height: 512,
        alt: "Stratagem Randomizer icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Stratagem Randomizer",
    description:
      "Randomly pick 4 Helldivers 2 stratagems from your unlocked warbonds.",
    images: ["icons/pwa-512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stratagems",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c8aa3e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${basePath}/icons/pwa-192.png`} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AntdRegistry>{children}</AntdRegistry>
        <RegisterSW />
      </body>
    </html>
  );
}
