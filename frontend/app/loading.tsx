// App Router's global loading fallback — shown automatically while a route
// segment's data is being fetched, so navigation never shows a blank screen.
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
  );
}
