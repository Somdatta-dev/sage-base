"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Manually trigger Zustand rehydration from localStorage
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (_hasHydrated && isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login(email, password);
      setAuth(response.user, response.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#ff6b6b] to-[#ffa502] flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-xl font-semibold text-[#e3e3e3]">SageBase</span>
          </div>
          <p className="text-[#9b9b9b] text-sm">Sign in to your workspace</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#202020] border border-[#373737] rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-[#eb5757]/10 border border-[#eb5757]/20 rounded text-[#eb5757] text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm text-[#9b9b9b] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#191919] border border-[#373737] rounded text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-[#2383e2] transition-colors text-sm"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-[#9b9b9b] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#191919] border border-[#373737] rounded text-[#e3e3e3] placeholder-[#6b6b6b] focus:outline-none focus:border-[#2383e2] transition-colors text-sm"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-[#2383e2] hover:bg-[#1a6fc2] text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Continue with Email"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-[#6b6b6b]">
            Contact your administrator for account access
          </p>
        </div>
      </div>
    </div>
  );
}
