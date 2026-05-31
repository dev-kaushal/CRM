"use client";
import { WidgetWrapper } from "@/components/dashboard/widgets/widget-wrapper";

export default function CustomersPage() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div>
        <h1 className="cause-font text-2xl font-bold" style={{ color: "var(--text-color)" }}>Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">Active customer retainer panel with lifetime value tracking.</p>
      </div>
      <WidgetWrapper empty emptyTitle="Customer directory ready" emptyDescription="View accounts with executed contracts and total client value."><div /></WidgetWrapper>
    </div>
  );
}
