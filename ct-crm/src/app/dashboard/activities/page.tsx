"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function ActivitiesPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Activities</h1>
        <p className="text-sm text-muted-foreground mt-1">Chronological global activity logs across all CRM entities.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Activity timeline ready" emptyDescription="Full timeline of emails, calls, notes, and status changes."><div /></WidgetWrapper>
    </div>
  );
}
