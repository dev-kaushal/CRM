"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function DealsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Deal Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Visual drag-and-drop pipeline board with forecast view.</p>
        </div>
        <button className="h-9 px-4 rounded-xl text-xs font-semibold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>+ New Deal</button>
      </div>
      <WidgetWrapper empty emptyTitle="Pipeline board ready" emptyDescription="Drag-and-drop deal pipeline with value summaries."><div /></WidgetWrapper>
    </div>
  );
}
