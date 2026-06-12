export default function TasksLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto is-pulsing">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg" style={{ background: "var(--accent)" }} />
          <div className="h-4 w-56 rounded" style={{ background: "var(--accent)" }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ background: "var(--accent)" }} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <div className="h-5 w-24 rounded" style={{ background: "var(--accent)" }} />
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-16 rounded-xl" style={{ background: "var(--accent)" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
