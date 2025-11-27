"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Book, Lock, Search, FileText, FolderOpen, Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-925 via-slate-900 to-sage-950">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sage-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sage-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sage-700/10 rounded-full blur-3xl" />

        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center">
              <Book className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">
              SageBase
            </span>
          </div>
          <a
            href="/login"
            className="px-5 py-2.5 text-sm font-medium bg-sage-600 hover:bg-sage-500 text-white rounded-lg transition-colors"
          >
            Sign In
          </a>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-900/50 border border-sage-700/50 text-sage-300 text-sm mb-8">
              <Lock className="w-4 h-4" />
              <span>Internal Knowledge Base</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Your company&apos;s
              <span className="bg-gradient-to-r from-sage-400 to-sage-600 bg-clip-text text-transparent">
                {" "}
                knowledge hub
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 leading-relaxed">
              Create, organize, and discover internal documentation with a
              beautiful Notion-style editor. Built for teams who value clarity,
              security, and efficiency.
            </p>

            <a
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium bg-gradient-to-r from-sage-600 to-sage-700 hover:from-sage-500 hover:to-sage-600 text-white rounded-xl transition-all shadow-lg shadow-sage-900/50"
            >
              Sign In to Continue
            </a>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-32">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-sage-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sage-900/50 flex items-center justify-center mb-6">
                <FileText className="w-6 h-6 text-sage-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Rich Documentation
              </h3>
              <p className="text-gray-400">
                Notion-style editor with headings, lists, code blocks, images,
                and more.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-sage-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sage-900/50 flex items-center justify-center mb-6">
                <FolderOpen className="w-6 h-6 text-sage-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Organized Spaces
              </h3>
              <p className="text-gray-400">
                Group documentation by team or project with flexible
                hierarchical pages.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-sage-700/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-sage-900/50 flex items-center justify-center mb-6">
                <Search className="w-6 h-6 text-sage-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Powerful Search
              </h3>
              <p className="text-gray-400">
                Find any document instantly with full-text and AI-powered
                semantic search.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            SageBase — Open Source Knowledge Base
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
