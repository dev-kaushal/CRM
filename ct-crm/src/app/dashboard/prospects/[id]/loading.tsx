export default function ProspectDetailLoading() {
  return (
    <div className="space-y-5 max-w-[1600px] mx-auto is-pulsing">
      <div className="h-4 w-32 rounded" style={{ background: "var(--accent)" }} />

      {/* Header skeleton */}
      <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl" style={{ background: "var(--accent)" }} />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-3 w-32 rounded" style={{ background: "var(--accent)" }} />
            <div className="flex gap-2 mt-2">
              <div className="h-6 w-20 rounded-lg" style={{ background: "var(--accent)" }} />
              <div className="h-6 w-20 rounded-lg" style={{ background: "var(--accent)" }} />
              <div className="h-6 w-20 rounded-lg" style={{ background: "var(--accent)" }} />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-28 rounded-xl" style={{ background: "var(--accent)" }} />
          ))}
        </div>
      </div>

      {/* Body skeleton */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "180px 1fr" }}>
        <div className="hidden md:block h-48 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }} />
        <div className="space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
