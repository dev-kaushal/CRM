"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function TeamPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Team</h1>
        <p className="text-sm text-muted-foreground mt-1">Internal team onboarding, role management, and permissions.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Team management ready" emptyDescription="Manage team members, roles, and access permissions."><div /></WidgetWrapper>
    </div>
  );
}
