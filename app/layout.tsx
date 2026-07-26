import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: {
    default: "Formation SAMO — Support informatique à distance",
    template: "%s — Formation SAMO",
  },
  description:
    "Formation professionnelle à distance en support informatique — depuis 1989. Plateforme d'apprentissage pour étudiants, formateurs et administration.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Formation SAMO — Support informatique à distance",
    description:
      "Formation professionnelle à distance en support informatique — depuis 1989.",
    siteName: "Formation SAMO",
    locale: "fr_CA",
    type: "website",
    images: ["/logo-samo.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-100">

        <Navbar />

        <main>
          {children}
        </main>

      </body>
    </html>
  );
}