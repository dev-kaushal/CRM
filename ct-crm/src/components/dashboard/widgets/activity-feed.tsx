"use client";

import { WidgetWrapper } from "./widget-wrapper";
import { ACTIVITY_TYPES, formatRelativeDate } from "@/lib/constants";
import type { Activity } from "@/lib/types";

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  return (
    <WidgetWrapper
      title="Activity Feed"
      subtitle="Latest actions across your CRM"
      loading={loading}
      empty={activities.length === 0}
      emptyTitle="No activities yet"
      emptyDescription="Activities will appear as your team works."
      noPadding
    >
      <div className="max-h-80 overflow-y-auto">
        {activities.map((activity, i) => {
          const config = ACTIVITY_TYPES[activity.type] || {
            label: activity.type,
            emoji: "📋",
            color: "#717478",
          };

          return (
            <div
              key={activity.id || i}
              className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-accent/50"
              style={{
                borderBottom: i < activities.length - 1 ? "1px solid var(--card-border)" : "none",
              }}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm mt-0.5"
                style={{ background: `${config.color}15`, color: config.color }}
              >
                {config.emoji}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: "var(--text-color)" }}>
                  <span className="font-medium">{activity.user_name || "System"}</span>{" "}
                  <span className="text-muted-foreground">{activity.description}</span>
                </p>
                {activity.entity_name && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--graph-to)" }}
                  >
                    {activity.entity_name}
                  </span>
                )}
              </div>

              {/* Time */}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                {formatRelativeDate(activity.created_at)}
              </span>
            </div>
          );
        })}
      </div>
    </WidgetWrapper>
  );
}
