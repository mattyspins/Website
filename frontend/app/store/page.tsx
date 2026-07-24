import type { Metadata } from "next";
import StoreContent from "./StoreContent";
import { API_URL } from "@/lib/api";
import type { StoreItem, StoreCategory } from "@/types/store";

export const metadata: Metadata = {
  title: "Matty Coin Store",
  description: "Spend your MattySpins Matty Coins on exclusive rewards and drops.",
  alternates: { canonical: "/store" },
};

/**
 * Server-fetches the default (all-categories) store listing so it's real on
 * first paint. `cache: "no-store"` because stock/availability changes as
 * people purchase — a cached snapshot could show something as in stock that
 * just sold out. Any failure returns null and StoreContent falls back to its
 * original client-fetch-on-mount behavior.
 */
async function getInitialData(): Promise<{ items: StoreItem[]; categories: StoreCategory[] } | null> {
  try {
    const [itemsRes, categoriesRes] = await Promise.all([
      fetch(`${API_URL}/api/store/items`, { cache: "no-store" }),
      fetch(`${API_URL}/api/store/categories`, { cache: "no-store" }),
    ]);
    if (!itemsRes.ok || !categoriesRes.ok) return null;
    const [itemsJson, categoriesJson] = await Promise.all([itemsRes.json(), categoriesRes.json()]);
    if (!itemsJson.success || !categoriesJson.success) return null;
    return {
      items: itemsJson.data?.items ?? [],
      categories: categoriesJson.data?.categories ?? [],
    };
  } catch {
    return null;
  }
}

export default async function Page() {
  const initialData = await getInitialData();
  return <StoreContent initialData={initialData} />;
}
