"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuroraBackground from "@/components/AuroraBackground";
import ViewingSessionTracker from "@/components/ViewingSessionTracker";

// Decides whether a page gets the public site chrome (aurora + navbar + footer)
// or nothing at all, because /admin/* brings its own shell.
//
// This deliberately reads the pathname on the client rather than a request
// header: the root layout renders once and is NOT re-rendered on client-side
// navigation, so a header-based check left the public navbar mounted on top of
// the admin shell whenever you clicked through to /admin from the site.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  return (
    <>
      <AuroraBackground />
      <Navbar />
      <ViewingSessionTracker />
      <main id="main-content" className="relative z-10 min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
