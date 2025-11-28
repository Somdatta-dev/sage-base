"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SearchModal } from "@/components/layout/SearchModal";
import { CreateSpaceModal } from "@/components/spaces/CreateSpaceModal";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const { searchOpen, createSpaceOpen, setCreateSpaceOpen } = useUIStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#191919]">
        <Loader2 className="w-6 h-6 animate-spin text-[#9b9b9b]" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#191919] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      {searchOpen && <SearchModal />}
      <CreateSpaceModal open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} />
    </div>
  );
}
