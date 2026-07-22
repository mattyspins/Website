import HomeContent from "./HomeContent";

// Root metadata (title/description/canonical) already covers the homepage —
// this wrapper's only job is making "/" a Server Component boundary so the
// interactive bits (search-param toast, intro splash) live in a client leaf
// instead of forcing the whole route to opt out of static rendering choices
// at this level.
export default function Page() {
  return <HomeContent />;
}
