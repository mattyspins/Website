import type { Metadata } from "next";
import StoreContent from "./StoreContent";

export const metadata: Metadata = {
  title: "Coin Store",
  description: "Spend your MattySpins coins on exclusive rewards and drops.",
  alternates: { canonical: "/store" },
};

export default function Page() {
  return <StoreContent />;
}
