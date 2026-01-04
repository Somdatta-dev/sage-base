import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, Space, PageTreeItem } from "@/types";

// Auth Store with persistence - SSR safe using skipHydration
interface AuthState {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "sagebase-auth",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // Skip automatic hydration - we'll do it manually
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// UI Store
interface UIState {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  createSpaceOpen: boolean;
  setCreateSpaceOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  createSpaceOpen: false,
  setCreateSpaceOpen: (open) => set({ createSpaceOpen: open }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

// Space Store
interface SpaceState {
  spaces: Space[];
  setSpaces: (spaces: Space[]) => void;
  currentSpace: Space | null;
  setCurrentSpace: (space: Space | null) => void;
  pageTree: PageTreeItem[];
  setPageTree: (tree: PageTreeItem[]) => void;
}

export const useSpaceStore = create<SpaceState>((set) => ({
  spaces: [],
  setSpaces: (spaces) => set({ spaces }),
  currentSpace: null,
  setCurrentSpace: (space) => set({ currentSpace: space }),
  pageTree: [],
  setPageTree: (tree) => set({ pageTree: tree }),
}));

// AI Store
interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  timestamp: Date;
  attachment?: {
    documentId: string;
    filename: string;
  };
}

interface PageContext {
  pageId: number;
  pageTitle: string;
  spaceId: number;
}

interface AIState {
  // Sidebar state
  aiSidebarOpen: boolean;
  setAISidebarOpen: (open: boolean) => void;
  // Messages
  messages: AIMessage[];
  addMessage: (message: AIMessage) => void;
  clearMessages: () => void;
  // Configuration
  aiEnabled: boolean;
  setAIEnabled: (enabled: boolean) => void;
  // Current page context
  pageContext: PageContext | null;
  setPageContext: (context: PageContext | null) => void;
  // Page reload trigger (incremented when AI edits a page)
  pageReloadTrigger: number;
  triggerPageReload: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  aiSidebarOpen: false,
  setAISidebarOpen: (open) => set({ aiSidebarOpen: open }),
  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  aiEnabled: true, // Will be updated when AI status is fetched
  setAIEnabled: (enabled) => set({ aiEnabled: enabled }),
  pageContext: null,
  setPageContext: (context) => set({
    pageContext: context,
    // Clear messages when switching pages to remove old drafts
    messages: []
  }),
  pageReloadTrigger: 0,
  triggerPageReload: () => set((state) => ({ pageReloadTrigger: state.pageReloadTrigger + 1 })),
}));
