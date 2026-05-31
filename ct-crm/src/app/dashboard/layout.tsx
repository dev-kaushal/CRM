"use client";

import { SidebarProvider, useSidebar } from "@/hooks/use-sidebar";
import { Sidebar } from "@/components/dashboard/sidebar/sidebar";
import { Header } from "@/components/dashboard/header/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-color)" }}>
      {/* Ambient blobs */}
      <div className="background-animation">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: collapsed ? "68px" : "252px" }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
