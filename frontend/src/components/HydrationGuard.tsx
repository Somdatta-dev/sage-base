"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

interface HydrationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HydrationGuard({ children, fallback }: HydrationGuardProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    // Manually trigger Zustand rehydration from localStorage
    useAuthStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage
    if (hasHydrated) {
      setIsHydrated(true);
    }
  }, [hasHydrated]);

  // Fallback timeout in case rehydration doesn't trigger the callback
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsHydrated(true);
    }, 150);
    return () => clearTimeout(timeout);
  }, []);

  if (!isHydrated) {
    return (
      fallback || (
        <div className="h-screen flex items-center justify-center bg-[#191919]">
          <Loader2 className="w-6 h-6 animate-spin text-[#9b9b9b]" />
        </div>
      )
    );
  }

  return <>{children}</>;
}
