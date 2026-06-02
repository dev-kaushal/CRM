"use client";

import { AIReadySection } from "@/components/dashboard/widgets/ai-ready-section";

export default function WorkspaceEnginePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wider text-[var(--text-color)]">
          Universal Workspace Engine
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Dynamic custom spreadsheets, Saved views, command shortcuts, and AI Multi-Agent workloads.
        </p>
      </div>
      <AIReadySection />
    </div>
  );
}
