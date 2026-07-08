"use client";

import { useEffect } from "react";
import ErrorState from "@/components/ui/ErrorState";

// App Router's global error boundary — catches any render/data error that
// escapes a page and shows the branded error state instead of Next's default
// unstyled error screen.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ErrorState
        title="Something went wrong"
        message="This page ran into an unexpected error. You can try again, or head back home."
        actionLabel="Try Again"
        onAction={reset}
        showHomeButton
      />
    </div>
  );
}
