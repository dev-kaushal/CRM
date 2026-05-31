"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function ProspectsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Prospects</h1>
        <p className="text-sm text-muted-foreground mt-1">BANT qualification workspace — Budget, Authority, Need, Timeline.</p>
      </div>
      <WidgetWrapper empty emptyTitle="BANT qualification ready" emptyDescription="Qualify leads before advancing to deals."><div /></WidgetWrapper>
    </div>
  );
}
