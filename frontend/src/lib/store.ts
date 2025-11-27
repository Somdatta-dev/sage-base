import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Space, PageTreeItem } from "@/types";

// Auth Store with persistence
interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "sagebase-auth",
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
