"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function TasksPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Task checklist and schedules across list, board, and calendar views.</p>
        </div>
        <button className="h-9 px-4 rounded-xl text-xs font-semibold" style={{ background: "var(--graph-to)", color: "#0a0a0a" }}>+ New Task</button>
      </div>
      <WidgetWrapper empty emptyTitle="Task workspace ready" emptyDescription="Manage tasks by type, priority, and deadline."><div /></WidgetWrapper>
    </div>
  );
}
