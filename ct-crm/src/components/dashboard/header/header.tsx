"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { useUser } from "@/hooks/use-user";
import { useTheme } from "@/components/theme-provider";
import { playThemeToggleSound } from "@/lib/sound";
import { getAllReminders } from "@/server/calendar";
import { globalSearch, type SearchResult } from "@/server/search";
import {
  MenuIcon,
  SearchIcon,
  CirclePlusIcon,
  UserPlusIcon,
  HandCoinsIcon,
  CheckCheckIcon,
  ContactIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  UserRoundIcon,
  SettingsIcon,
  LogoutIcon,
  XIcon,
} from "@animateicons/react/lucide";

interface ReminderItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  title: string;
  type: string;
  datetime: string;
  done: boolean;
}

const QUICK_ACTIONS = [
  { label: "Create Lead", Icon: UserPlusIcon, href: "/dashboard/leads?new=1" },
  { label: "Create Deal", Icon: HandCoinsIcon, href: "/dashboard/deals?new=1" },
  { label: "Create Task", Icon: CheckCheckIcon, href: "/dashboard/tasks?new=1" },
  { label: "Create Contact", Icon: ContactIcon, href: "/dashboard/contacts?new=1" },
];

const RESULT_TYPE_META: Record<SearchResult["type"], { label: string; color: string }> = {
  lead: { label: "Lead", color: "#3b82f6" },
  deal: { label: "Deal", color: "#10b981" },
  contact: { label: "Contact", color: "#a855f7" },
  customer: { label: "Customer", color: "#f97316" },
};

function notificationHref(r: ReminderItem) {
  switch (r.entity_type) {
    case "lead":
      return `/dashboard/leads/${r.entity_id}`;
    case "prospect":
      return "/dashboard/prospects";
    case "contact":
      return "/dashboard/contacts";
    case "customer":
      return "/dashboard/customers";
    default:
      return "/dashboard/calendar";
  }
}

export function Header() {
  const { collapsed, toggle } = useSidebar();
  const { user, signOut } = useUser();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Animated icon refs
  const menuIconRef = useRef<any>(null);
  const searchIconRef = useRef<any>(null);
  const modalSearchIconRef = useRef<any>(null);
  const closeIconRef = useRef<any>(null);
  const quickActionsIconRef = useRef<any>(null);
  const quickActionItemRefs = useRef<any[]>([]);
  const bellIconRef = useRef<any>(null);
  const themeIconRef = useRef<any>(null);
  const profileIconRef = useRef<any>(null);
  const settingsIconRef = useRef<any>(null);
  const logoutIconRef = useRef<any>(null);

  // Search modal state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Notifications state — overdue + due-today reminders across all entities
  const [notifications, setNotifications] = useState<ReminderItem[]>([]);

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
        setShowNotifications(false);
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
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load overdue + due-today reminders for the notifications bell
  useEffect(() => {
    let cancelled = false;
    getAllReminders()
      .then((rows) => {
        if (cancelled) return;
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const due = (rows as ReminderItem[]).filter((r) => !r.done && new Date(r.datetime) <= endOfToday);
        setNotifications(due);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced global search
  useEffect(() => {
    if (!showSearch) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      globalSearch(q)
        .then((results) => setSearchResults(results))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, showSearch]);

  // Reset search state when modal closes
  useEffect(() => {
    if (!showSearch) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [showSearch]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const goTo = (href: string) => {
    setShowSearch(false);
    setShowQuickActions(false);
    setShowUserMenu(false);
    setShowNotifications(false);
    router.push(href);
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "CT";

  const overdueCount = notifications.length;

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 shrink-0"
        style={{
          background: "var(--card-bg-solid)",
          borderBottom: "1px solid var(--card-border)",
        }}
      >
        {/* Left: Collapse + Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              menuIconRef.current?.startAnimation();
              toggle();
            }}
            onMouseEnter={() => menuIconRef.current?.startAnimation()}
            onMouseLeave={() => menuIconRef.current?.stopAnimation()}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--text-color)", transition: "opacity 0.15s ease" }}
            aria-label="Toggle Sidebar"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <MenuIcon ref={menuIconRef} size={18} />
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setShowSearch(true)}
            onMouseEnter={() => searchIconRef.current?.startAnimation()}
            onMouseLeave={() => searchIconRef.current?.stopAnimation()}
            className="hidden md:flex items-center gap-2 h-9 pl-3 pr-3 rounded-xl text-sm hover:opacity-80"
            style={{
              background: "var(--accent)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--card-border)",
              transition: "opacity 0.15s ease",
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
              onMouseEnter={() => quickActionsIconRef.current?.startAnimation()}
              onMouseLeave={() => quickActionsIconRef.current?.stopAnimation()}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 active:scale-95"
              style={{ background: "var(--graph-to)", color: "#0a0a0a", transition: "opacity 0.15s ease" }}
              aria-label="Quick Actions"
            >
              <CirclePlusIcon ref={quickActionsIconRef} size={18} />
            </button>
            {showQuickActions && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}
              >
                {QUICK_ACTIONS.map((action, i) => {
                  const Icon = action.Icon;
                  return (
                    <button
                      key={action.label}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-accent"
                      style={{ color: "var(--text-color)", transition: "background 0.1s ease" }}
                      onClick={() => goTo(action.href)}
                      onMouseEnter={() => quickActionItemRefs.current[i]?.startAnimation()}
                      onMouseLeave={() => quickActionItemRefs.current[i]?.stopAnimation()}
                    >
                      <Icon ref={(el: any) => { quickActionItemRefs.current[i] = el; }} size={15} />
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              onMouseEnter={() => bellIconRef.current?.startAnimation()}
              onMouseLeave={() => bellIconRef.current?.stopAnimation()}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--text-color)", transition: "opacity 0.15s ease" }}
              aria-label="Notifications"
            >
              <BellIcon ref={bellIconRef} size={18} />
              {overdueCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  {overdueCount > 9 ? "9+" : overdueCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden shadow-lg z-50"
                style={{ background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }}
              >
                <div className="px-4 py-3 text-sm font-semibold" style={{ borderBottom: "1px solid var(--card-border)", color: "var(--text-color)" }}>
                  Notifications
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
                  ) : (
                    notifications.map((r) => {
                      const overdue = new Date(r.datetime) < new Date(new Date().setHours(0, 0, 0, 0));
                      return (
                        <button
                          key={r.id}
                          onClick={() => goTo(notificationHref(r))}
                          className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-accent"
                          style={{ transition: "background 0.1s ease" }}
                        >
                          <span
                            className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: overdue ? "#ef4444" : "#f59e0b" }}
                          />
                          <span className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate" style={{ color: "var(--text-color)" }}>{r.title}</span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {r.entity_name || r.entity_type} · {new Date(r.datetime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  onClick={() => goTo("/dashboard/calendar")}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-center hover:bg-accent"
                  style={{ borderTop: "1px solid var(--card-border)", color: "var(--graph-to)", transition: "background 0.1s ease" }}
                >
                  View Calendar
                </button>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => { playThemeToggleSound(theme === "dark" ? "light" : "dark"); toggleTheme(); }}
            onMouseEnter={() => themeIconRef.current?.startAnimation()}
            onMouseLeave={() => themeIconRef.current?.stopAnimation()}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 active:scale-95"
            style={{ background: "var(--accent)", color: "var(--text-color)", transition: "opacity 0.15s ease" }}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? <SunIcon ref={themeIconRef} size={18} /> : <MoonIcon ref={themeIconRef} size={18} />}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:opacity-80"
              style={{ background: "var(--accent)", border: "1px solid var(--card-border)", transition: "opacity 0.15s ease" }}
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
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-accent"
                    style={{ color: "var(--text-color)", transition: "background 0.1s ease" }}
                    onMouseEnter={() => profileIconRef.current?.startAnimation()}
                    onMouseLeave={() => profileIconRef.current?.stopAnimation()}
                    onClick={() => goTo("/dashboard/settings?tab=security")}
                  >
                    <UserRoundIcon ref={profileIconRef} size={15} /> Profile
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-accent"
                    style={{ color: "var(--text-color)", transition: "background 0.1s ease" }}
                    onMouseEnter={() => settingsIconRef.current?.startAnimation()}
                    onMouseLeave={() => settingsIconRef.current?.stopAnimation()}
                    onClick={() => goTo("/dashboard/settings")}
                  >
                    <SettingsIcon ref={settingsIconRef} size={15} /> Settings
                  </button>
                </div>
                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                  <button
                    onClick={handleSignOut}
                    onMouseEnter={() => logoutIconRef.current?.startAnimation()}
                    onMouseLeave={() => logoutIconRef.current?.stopAnimation()}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-destructive/10"
                    style={{ color: "#ef4444", transition: "background 0.1s ease" }}
                  >
                    <LogoutIcon ref={logoutIconRef} size={15} /> Sign Out
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
              <SearchIcon ref={modalSearchIconRef} size={18} isAnimated style={{ color: "var(--muted-foreground)" }} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => modalSearchIconRef.current?.startAnimation()}
                placeholder="Search leads, deals, contacts, customers..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text-color)" }}
              />
              <button
                onClick={() => setShowSearch(false)}
                onMouseEnter={() => closeIconRef.current?.startAnimation()}
                onMouseLeave={() => closeIconRef.current?.stopAnimation()}
                className="w-6 h-6 rounded flex items-center justify-center hover:opacity-80"
                style={{ color: "var(--muted-foreground)" }}
                aria-label="Close search"
              >
                <XIcon ref={closeIconRef} size={14} />
              </button>
              <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "var(--card-border)", color: "var(--muted-foreground)" }}>
                ESC
              </kbd>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {searchQuery.trim().length < 2 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Start typing to search across your CRM...</p>
                </div>
              ) : searching ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-muted-foreground">No results for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="py-1">
                  {searchResults.map((r) => {
                    const meta = RESULT_TYPE_META[r.type];
                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => goTo(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent"
                        style={{ transition: "background 0.1s ease" }}
                      >
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-color)" }}>{r.title}</span>
                          {r.subtitle && <span className="text-[11px] text-muted-foreground truncate">{r.subtitle}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
