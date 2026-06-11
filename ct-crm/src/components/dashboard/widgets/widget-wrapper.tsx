"use client";

import type { ReactNode } from "react";

interface WidgetWrapperProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  noPadding?: boolean;
}

export function WidgetWrapper({
  title,
  subtitle,
  children,
  loading,
  empty,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here once available.",
  emptyAction,
  className = "",
  headerAction,
  noPadding,
}: WidgetWrapperProps) {
  return (
    <div
      className={`rounded-2xl hover:shadow-lg ${className}`}
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        transition: "box-shadow 0.15s ease",
      }}
    >
      {/* Header */}
      {(title || headerAction) && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--card-border)" }}
        >
          <div>
            {title && (
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-color)" }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}

      {/* Content */}
      <div className={noPadding ? "" : "p-5"}>
        {loading ? (
          <WidgetSkeleton />
        ) : empty ? (
          <WidgetEmpty title={emptyTitle} description={emptyDescription} action={emptyAction} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// --- Skeleton Loading ---
function WidgetSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-24 rounded-lg" style={{ background: "var(--accent)" }} />
      <div className="h-4 w-48 rounded" style={{ background: "var(--accent)" }} />
      <div className="flex gap-2 mt-3">
        <div className="h-3 flex-1 rounded" style={{ background: "var(--accent)" }} />
        <div className="h-3 w-16 rounded" style={{ background: "var(--accent)" }} />
      </div>
    </div>
  );
}

// --- Empty State ---
function WidgetEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ background: "var(--accent)", border: "1px dashed var(--card-border)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-foreground)" }}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: "var(--text-color)" }}>
        {title}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
