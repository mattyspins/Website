import type { Metadata } from "next";
import ResponsibleGamingContent from "./ResponsibleGamingContent";

export const metadata: Metadata = {
  title: "Responsible Gaming",
  description: "Resources and tools for gambling responsibly while watching MattySpins.",
  alternates: { canonical: "/responsible-gaming" },
};

export default function Page() {
  return <ResponsibleGamingContent />;
}
