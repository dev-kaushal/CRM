"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSidebar } from "@/hooks/use-sidebar";
import { SIDEBAR_ROUTES } from "@/lib/constants";
import {
  LayoutDashboard,
  LayoutGrid,
  Users,
  Contact,
  Telescope,
  HandCoins,
  Clipboard,
  UserCheck,
  CheckCheck,
  Activity,
  BarChart,
  Settings,
} from "lucide-react";

// Icon mapping — lightweight lucide-react (no animation overhead)
const ICON_MAP: Record<string, any> = {
  LayoutDashboardIcon: LayoutDashboard,
  LayoutGridIcon: LayoutGrid,
  UsersIcon: Users,
  ContactIcon: Contact,
  TargetIcon: Telescope,
  HandshakeIcon: HandCoins,
  FileTextIcon: Clipboard,
  BuildingIcon: UserCheck,
  CheckSquareIcon: CheckCheck,
  ActivityIcon: Activity,
  BarChartIcon: BarChart,
  SettingsIcon: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col"
      style={{
        width: collapsed ? "68px" : "252px",
        background: "var(--card-bg-solid)",
        borderRight: "1px solid var(--card-border)",
        transition: "width 0.25s ease",
        willChange: "width",
      }}
    >
      {/* Brand Logo */}
      <div className="flex items-center h-16 px-4 shrink-0" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
            style={{
              background: "linear-gradient(135deg, #a855f7, #00f2fe)",
              color: "#0a0a0a",
            }}
          >
            CT
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="brand-logo-text text-sm leading-none" style={{ fontSize: "1rem", marginBottom: "1px" }}>
                CT-CRM
              </span>
              <span className="brand-logo-subtitle" style={{ fontSize: "0.35rem", letterSpacing: "0.2em" }}>
                Enterprise
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-0.5">
        {SIDEBAR_ROUTES.map((route) => {
          const isActive = pathname === route.path;
          const IconComponent = ICON_MAP[route.icon] || Users;

          return (
            <SidebarNavItem
              key={route.path}
              href={route.path}
              label={route.label}
              description={route.description}
              isActive={isActive}
              collapsed={collapsed}
              IconComponent={IconComponent}
            />
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="shrink-0 p-3" style={{ borderTop: "1px solid var(--card-border)" }}>
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">System Online</span>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}

// --- Individual Nav Item ---
function SidebarNavItem({
  href,
  label,
  description,
  isActive,
  collapsed,
  IconComponent,
}: {
  href: string;
  label: string;
  description: string;
  isActive: boolean;
  collapsed: boolean;
  IconComponent: any;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 overflow-hidden"
      style={{
        background: isActive ? "var(--accent)" : "transparent",
        color: isActive ? "var(--text-color)" : "var(--muted-foreground)",
        transition: "background 0.15s ease, color 0.15s ease",
      }}
      title={collapsed ? label : undefined}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ background: "var(--graph-to)" }}
        />
      )}

      <div className="flex items-center justify-center w-5 h-5 shrink-0">
        <IconComponent size={18} strokeWidth={isActive ? 2.5 : 2} />
      </div>

      {!collapsed && (
        <div className="flex flex-col overflow-hidden min-w-0">
          <span
            className="text-sm font-medium truncate"
            style={{ color: isActive ? "var(--text-color)" : undefined }}
          >
            {label}
          </span>
          {isActive && (
            <span className="text-[10px] text-muted-foreground truncate">{description}</span>
          )}
        </div>
      )}

      {/* Hover tooltip for collapsed mode */}
      {collapsed && (
        <div
          className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-50"
          style={{
            background: "var(--card-bg-solid)",
            border: "1px solid var(--card-border)",
            color: "var(--text-color)",
            boxShadow: "var(--glass-shadow)",
            transition: "opacity 0.1s ease",
          }}
        >
          {label}
        </div>
      )}
    </Link>
  );
}
