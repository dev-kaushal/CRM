export default function ContractsLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg" style={{ background: "var(--accent)" }} />
          <div className="h-4 w-64 rounded" style={{ background: "var(--accent)" }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ background: "var(--accent)" }} />
      </div>
      <div className="h-14 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }} />
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="h-12 border-b" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 border-b flex items-center px-4 gap-4" style={{ borderColor: "var(--card-border)" }}>
            <div className="h-4 w-36 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-24 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-40 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-20 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-6 w-20 rounded-xl ml-auto" style={{ background: "var(--accent)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
