"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance reports — funnel analysis, attribution, cohort velocity.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Analytics dashboard ready" emptyDescription="Lead funnel charts, marketing attribution, and cohort analysis."><div /></WidgetWrapper>
    </div>
  );
}
