"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function ContactsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Contacts</h1>
        <p className="text-sm text-muted-foreground mt-1">Unified contact database with company grouping and tag filtering.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Contact profiles ready" emptyDescription="Your qualified contact database will appear here."><div /></WidgetWrapper>
    </div>
  );
}
