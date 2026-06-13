export default function CalendarLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto is-pulsing">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg" style={{ background: "var(--accent)" }} />
          <div className="h-4 w-72 rounded" style={{ background: "var(--accent)" }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-16 rounded-xl" style={{ background: "var(--accent)" }} />
          <div className="h-9 w-9 rounded-xl" style={{ background: "var(--accent)" }} />
          <div className="h-5 w-32 rounded" style={{ background: "var(--accent)" }} />
          <div className="h-9 w-9 rounded-xl" style={{ background: "var(--accent)" }} />
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
        <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--card-border)" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="px-2 py-2 flex justify-center">
              <div className="h-3 w-8 rounded" style={{ background: "var(--accent)" }} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 42 }, (_, i) => (
            <div key={i} className="p-2 min-h-[88px] border-b border-r space-y-1.5" style={{ borderColor: "var(--card-border)" }}>
              <div className="h-6 w-6 rounded-full" style={{ background: "var(--accent)" }} />
              <div className="h-3 w-full rounded" style={{ background: "var(--accent)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
