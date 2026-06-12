export default function ContactsLoading() {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto is-pulsing">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 rounded-lg" style={{ background: "var(--accent)" }} />
          <div className="h-4 w-80 rounded" style={{ background: "var(--accent)" }} />
        </div>
      </div>
      <div className="h-14 rounded-2xl" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }} />
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div className="h-12 border-b" style={{ background: "var(--accent)", borderColor: "var(--card-border)" }} />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-14 border-b flex items-center px-4 gap-4" style={{ borderColor: "var(--card-border)" }}>
            <div className="h-4 w-32 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-28 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-44 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-20 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-4 w-24 rounded" style={{ background: "var(--accent)" }} />
            <div className="h-6 w-16 rounded-xl ml-auto" style={{ background: "var(--accent)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
