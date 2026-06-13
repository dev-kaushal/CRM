"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { Calendar, type LucideProps } from "lucide-react";

export interface AnimatedIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/**
 * No animated Calendar icon exists in `@animateicons/react/lucide`. This wraps the
 * plain lucide `Calendar` icon with the same `startAnimation`/`stopAnimation` imperative
 * handle the sidebar expects, playing a one-shot "flip" via `.ct-calendar-icon-play` (globals.css).
 */
export const CalendarIcon = forwardRef<AnimatedIconHandle, LucideProps>(function CalendarIcon(props, ref) {
  const [playKey, setPlayKey] = useState(0);

  useImperativeHandle(ref, () => ({
    startAnimation: () => setPlayKey((k) => k + 1),
    stopAnimation: () => {},
  }), []);

  return <Calendar key={playKey} {...props} className={`${props.className ?? ""} ${playKey > 0 ? "ct-calendar-icon-play" : ""}`.trim()} />;
});
