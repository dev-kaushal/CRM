"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useUser } from "@/hooks/use-user";
import { useTheme } from "@/components/theme-provider";
import {
  SunIcon,
  MoonIcon,
  SearchIcon,
  BellIcon,
} from "@animateicons/react/lucide";

export function Header() {
  const { collapsed, toggle } = useSidebar();
  const { user, signOut } = useUser();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const searchIconRef = useRef<any>(null);
  const bellIconRef = useRef<any>(null);

  // Keyboard shortcut: CMD+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowUserMenu(false);
        setShowQuickActions(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setShowQuickActions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "CT";

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 shrink-0"
        style={{
          background: "var(--card-bg-solid)",
          borderBottom: "1px solid var(--card-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Left: Collapse + Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--accent)", color: "var(--text-color)" }}
            aria-label="Toggle Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed ? (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="15" y2="12" />
                  <line x1="3" y1="18" x2="18" y2="18" />
                </>
              )}
            </svg>
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setShowSearch(true)}
            onMouseEnter={() => searchIconRef.current?.startAnimation()}
            onMouseLeave={() => searchIconRef.current?.stopAnimation()}
            className="hidden md:flex items-center gap-2 h-9 pl-3 pr-3 rounded-xl text-sm transition-all hover:scale-[1.02]"
            style={{
              background: "var(--accent)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--card-border)",
            }}
          >
            <SearchIcon ref={searchIconRef} size={15} />
            <span>Search...</span>
            <kbd
              className="ml-4 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "var(--card-border)", color: "var(--text-color)" }}
            >
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Actions */}
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105 text-sm font-bold"
              style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
              aria-label="Quick Actions"
            >
              +
            </button>
            {showQuickActions && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}
              >
                {[
                  { label: "Create Lead", emoji: "🎯" },
                  { label: "Create Deal", emoji: "💰" },
                  { label: "Create Task", emoji: "✅" },
                  { label: "Create Contact", emoji: "👤" },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-accent"
                    style={{ color: "var(--text-color)" }}
                    onClick={() => setShowQuickActions(false)}
                  >
                    <span>{action.emoji}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onMouseEnter={() => bellIconRef.current?.startAnimation()}
            onMouseLeave={() => bellIconRef.current?.stopAnimation()}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--accent)", color: "var(--text-color)" }}
            aria-label="Notifications"
          >
            <BellIcon ref={bellIconRef} size={18} />
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              3
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
            style={{ background: "var(--accent)", color: "var(--text-color)" }}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: "var(--accent)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, #a855f7, #00f2fe)", color: "#0a0a0a" }}
              >
                {initials}
              </div>
              {user?.user_metadata?.full_name && (
                <span className="hidden md:block text-sm font-medium truncate max-w-[100px]" style={{ color: "var(--text-color)" }}>
                  {user.user_metadata.full_name}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}
              >
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--text-color)" }}>
                    {user?.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-accent"
                    style={{ color: "var(--text-color)" }}
                  >
                    <span>👤</span> Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-accent"
                    style={{ color: "var(--text-color)" }}
                    onClick={() => { setShowUserMenu(false); router.push("/dashboard/settings"); }}
                  >
                    <span>⚙️</span> Settings
                  </button>
                </div>
                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-destructive/10"
                    style={{ color: "#ef4444" }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSearch(false)} />
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-3 px-4 h-14" style={{ borderBottom: "1px solid var(--card-border)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-foreground)" }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search leads, deals, contacts, tasks..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text-color)" }}
              />
              <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--card-border)", color: "var(--muted-foreground)" }}>
                ESC
              </kbd>
            </div>
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Start typing to search across your CRM...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
