"use client";

import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function LeadsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>
            Leads Intake
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and qualify incoming leads across all channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="wm-btn wm-btn-outline text-xs h-9 px-3 rounded-xl">Import</button>
          <button className="wm-btn wm-btn-outline text-xs h-9 px-3 rounded-xl">Export</button>
          <button
            className="h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
          >
            + New Lead
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--accent)", border: "1px solid var(--card-border)" }}>
        {["Table", "Kanban", "Grid"].map((view) => (
          <button
            key={view}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: view === "Table" ? "var(--card-bg-solid)" : "transparent",
              color: view === "Table" ? "var(--text-color)" : "var(--muted-foreground)",
            }}
          >
            {view}
          </button>
        ))}
      </div>

      <WidgetWrapper
        empty
        emptyTitle="Leads workspace ready"
        emptyDescription="This is where your leads table, kanban board, and grid views will live. Full implementation coming in Phase 2."
        emptyAction={
          <button
            className="text-xs font-semibold px-4 py-2 rounded-lg"
            style={{ background: "var(--graph-to)", color: "#0a0a0a" }}
          >
            Create First Lead
          </button>
        }
      >
        <div />
      </WidgetWrapper>
    </div>
  );
}
