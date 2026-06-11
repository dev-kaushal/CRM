"use client";

import { useEffect, useRef } from "react";

export interface ViewSwitcherOption {
  id: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Segmented view switcher (Table/Kanban/Grid, etc.) with a sliding active
 * pill — transitions-dev "16-tabs-sliding" (.t-tabs / .t-tabs-pill / .t-tab).
 */
export function ViewSwitcher({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: ViewSwitcherOption[];
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    movePill(bar, pill, value, !isFirst.current);
    isFirst.current = false;
  }, [value]);

  useEffect(() => {
    const handleResize = () => {
      const bar = barRef.current;
      const pill = pillRef.current;
      if (!bar || !pill) return;
      movePill(bar, pill, value, false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [value]);

  return (
    <div ref={barRef} className="t-tabs" role="tablist">
      <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          data-id={opt.id}
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className="t-tab flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function movePill(bar: HTMLDivElement, pill: HTMLSpanElement, activeId: string, animate: boolean) {
  const active = bar.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
  if (!active) return;
  if (!animate) {
    const prevTransition = pill.style.transition;
    pill.style.transition = "none";
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
    pill.style.width = `${active.offsetWidth}px`;
    void pill.offsetWidth;
    pill.style.transition = prevTransition;
  } else {
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
    pill.style.width = `${active.offsetWidth}px`;
  }
}
