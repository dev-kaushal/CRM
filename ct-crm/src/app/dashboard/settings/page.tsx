"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">System configuration — Organization, integrations, custom fields. Admin only.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Settings workspace ready" emptyDescription="Configure organization settings, integrations, and custom fields."><div /></WidgetWrapper>
    </div>
  );
}
