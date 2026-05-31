"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function ContractsPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Contracts</h1>
        <p className="text-sm text-muted-foreground mt-1">Contract lifecycle tracking — Draft, Sent, Signed, Expired.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Contract tracker ready" emptyDescription="Track contracts with e-signature and version control."><div /></WidgetWrapper>
    </div>
  );
}
