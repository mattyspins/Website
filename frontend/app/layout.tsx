import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuroraBackground from "@/components/AuroraBackground";
import ToastProvider from "@/components/ui/ToastProvider";
import ViewingSessionTracker from "@/components/ViewingSessionTracker";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://mattyspins.com";
const SITE_NAME = "MattySpins";
// Benefit-led, not brand-led: the tag has to answer "what do I get" for someone
// who has never heard of the channel.
const TAGLINE = "Watch, play, and earn — turn stream time into rewards";
const DESCRIPTION =
  "Earn coins just for watching MattySpins on Kick, compete on live wager leaderboards, play chat-driven stream games like Boss Raid and Bonus Bingo, and redeem your coins for real rewards.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // %s lets every child route set a short title and inherit the brand suffix.
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "MattySpins", "Kick streamer", "slots stream", "bonus hunt",
    "wager leaderboard", "stream games", "community rewards", "Razed partner",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    creator: "@mattyspinsslots",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "entertainment",
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // Lets the layout paint into the notch area on iOS; paired with
  // env(safe-area-inset-*) usage in components.
  viewportFit: "cover",
};

// Organization + WebSite schema. The WebSite node is what makes a sitelinks
// search box possible later; Organization consolidates brand identity across
// the Kick/Discord/X profiles.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/mattyspins-logo.png`,
      description: DESCRIPTION,
      sameAs: [
        "https://kick.com/mattyspinsslots",
        "https://x.com/mattyspinsslots",
        "https://www.instagram.com/mattyspinsslots/",
        "https://discord.gg/n2gCDVwebw",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-GB",
    },
  ],
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
      <html lang="en-GB" style={{ background: "transparent" }}>
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
  // public site's Navbar/AuroraBackground/Footer chrome.
  if (isAdmin) {
    return (
      <html lang="en-GB">
        <head>
          <link rel="icon" href="/favicon.ico" />
        </head>
        <body className={inter.className}>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en-GB">
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {/* First tab stop on every page — lets keyboard users jump the navbar. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:border focus:border-gold-500 focus:bg-navy-800 focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <ToastProvider>
          <AuroraBackground />
          <Navbar />
          <ViewingSessionTracker />
          <main id="main-content" className="relative z-10 min-h-screen">
            {children}
          </main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
