"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { initializeAuth, storeAuthData } from "@/lib/authPersistence";

function AuthCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      // Read directly from the URL so we always get the real params after the
      // OAuth redirect, regardless of Next.js SSR/hydration timing.
      const params = new URLSearchParams(window.location.search);
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setMessage(decodeURIComponent(error));
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      const success = params.get("success");
      if (success === "true") {
        // Tokens are already in httpOnly cookies set by the backend.
        // Just verify the session and cache the user profile.
        try {
          const user = await initializeAuth();
          if (user) {
            storeAuthData(user);
            setStatus("success");
            setMessage("Login successful! Redirecting...");
            setTimeout(() => router.push("/"), 1200);
          } else {
            setStatus("error");
            setMessage("Authentication failed. Please try again.");
            setTimeout(() => router.push("/"), 3000);
          }
        } catch {
          setStatus("error");
          setMessage("An error occurred during authentication.");
          setTimeout(() => router.push("/"), 3000);
        }
        return;
      }

      // No recognised params
      setStatus("error");
      setMessage("Authentication failed. No valid response received.");
      setTimeout(() => router.push("/"), 3000);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-lg border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Authenticating</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-green-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
              <p className="text-gray-400">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to home page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-lg border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Authenticating</h2>
            <p className="text-gray-400">Processing authentication...</p>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
