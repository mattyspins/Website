"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { storeAuthData } from "@/lib/authPersistence";

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL parameters (if backend redirects with them)
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const error = searchParams.get("error");

        if (error) {
          setStatus("error");
          setMessage(decodeURIComponent(error));
          setTimeout(() => router.push("/"), 3000);
          return;
        }

        if (accessToken && refreshToken) {
          // Store user info if available
          const userId = searchParams.get("user_id");
          const displayName = searchParams.get("display_name");
          const isAdmin = searchParams.get("is_admin");
          const isModerator = searchParams.get("is_moderator");

          if (userId && displayName) {
            const userInfo = {
              id: userId,
              displayName: decodeURIComponent(displayName),
              avatar: "",
              points: 0,
              isAdmin: isAdmin === "true",
              isModerator: isModerator === "true",
            };

            // Store auth data with persistence (default 1 hour expiry)
            storeAuthData(accessToken, refreshToken, userInfo, 3600);
          } else {
            // Fallback: store tokens without user info
            localStorage.setItem("access_token", accessToken);
            localStorage.setItem("refresh_token", refreshToken);
          }

          setStatus("success");
          setMessage("Login successful! Redirecting...");

          // Redirect to home page
          setTimeout(() => router.push("/"), 1500);
        } else {
          setStatus("error");
          setMessage("Authentication failed. No tokens received.");
          setTimeout(() => router.push("/"), 3000);
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("An error occurred during authentication.");
        setTimeout(() => router.push("/"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-green-900 flex items-center justify-center">
      <div className="bg-black/50 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Authenticating
              </h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="text-green-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-gray-400">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="text-red-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Authentication Failed
              </h2>
              <p className="text-gray-400">{message}</p>
              <p className="text-sm text-gray-500 mt-2">
                Redirecting to home page...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
