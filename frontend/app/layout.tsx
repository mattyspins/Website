import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ToastProvider from "@/components/ui/ToastProvider";
import ViewingSessionTracker from "@/components/ViewingSessionTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://mattyspins.com"),
  title: "MattySpins - Premium Gaming Experience",
  description:
    "Join MattySpins for the ultimate gaming community with live streams, leaderboards, and bonus hunts",
  keywords: "gaming, streaming, casino, bonus hunt, leaderboards, community",
  authors: [{ name: "MattySpins" }],
  openGraph: {
    title: "MattySpins - Premium Gaming Experience",
    description:
      "Join MattySpins for the ultimate gaming community with live streams, leaderboards, and bonus hunts",
    type: "website",
    url: "https://mattyspins.com",
    siteName: "MattySpins",
  },
  twitter: {
    card: "summary_large_image",
    title: "MattySpins - Premium Gaming Experience",
    description:
      "Join MattySpins for the ultimate gaming community with live streams, leaderboards, and bonus hunts",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isObs = headers().get("x-obs-route") === "1";
  const isAdmin = headers().get("x-admin-route") === "1";

  if (isObs) {
    return (
      <html lang="en" style={{ background: "transparent" }}>
        <head>
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body className={inter.className} style={{ background: "transparent" }}>
          {children}
        </body>
      </html>
    );
  }

  // Admin gets its own shell (sidebar + top nav, built per-page) instead of the
  // public site's Navbar/ParticleBackground/Footer chrome.
  if (isAdmin) {
    return (
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body className={inter.className}>
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <ParticleBackground />
          <Navbar />
          <ViewingSessionTracker />
          <main className="relative z-10 min-h-screen">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
