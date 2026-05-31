export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="space-y-3">
              <div className="h-3 w-20 rounded" style={{ background: "var(--accent)" }} />
              <div className="h-8 w-28 rounded-lg" style={{ background: "var(--accent)" }} />
              <div className="h-4 w-16 rounded" style={{ background: "var(--accent)" }} />
              <div className="h-8 w-full rounded" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-5"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div className="space-y-3">
              <div className="h-3 w-20 rounded" style={{ background: "var(--accent)" }} />
              <div className="h-8 w-28 rounded-lg" style={{ background: "var(--accent)" }} />
              <div className="h-4 w-16 rounded" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeletons */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 h-72" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="h-3 w-32 rounded mb-4" style={{ background: "var(--accent)" }} />
          <div className="h-full rounded-xl" style={{ background: "var(--accent)" }} />
        </div>
        <div className="rounded-2xl p-5 h-72" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <div className="h-3 w-32 rounded mb-4" style={{ background: "var(--accent)" }} />
          <div className="h-full rounded-xl" style={{ background: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}
