"use client";

import { WidgetWrapper } from "./widget-wrapper";
import { TASK_PRIORITIES, formatRelativeDate } from "@/lib/constants";
import type { Task } from "@/lib/types";

interface TaskCenterProps {
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  loading?: boolean;
}

export function TaskCenter({ todayTasks, overdueTasks, upcomingTasks, loading }: TaskCenterProps) {
  const totalTasks = todayTasks.length + overdueTasks.length + upcomingTasks.length;

  return (
    <WidgetWrapper
      title="Task Center"
      subtitle={`${totalTasks} tasks tracked`}
      loading={loading}
      empty={totalTasks === 0}
      emptyTitle="No tasks assigned"
      emptyDescription="Create tasks to keep your team on track."
      noPadding
    >
      {/* Summary Bar */}
      <div className="flex items-center gap-4 px-5 py-3" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <CountBadge label="Today" count={todayTasks.length} color="#3b82f6" />
        <CountBadge label="Overdue" count={overdueTasks.length} color="#ef4444" />
        <CountBadge label="Upcoming" count={upcomingTasks.length} color="#eab308" />
      </div>

      {/* Task List */}
      <div className="max-h-64 overflow-y-auto">
        {overdueTasks.length > 0 && (
          <TaskGroup label="Overdue" tasks={overdueTasks} color="#ef4444" />
        )}
        {todayTasks.length > 0 && (
          <TaskGroup label="Today" tasks={todayTasks} color="#3b82f6" />
        )}
        {upcomingTasks.length > 0 && (
          <TaskGroup label="Upcoming" tasks={upcomingTasks} color="#eab308" />
        )}
      </div>
    </WidgetWrapper>
  );
}

function CountBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

function TaskGroup({ label, tasks, color }: { label: string; tasks: Task[]; color: string }) {
  return (
    <div>
      <div className="px-5 py-1.5" style={{ background: `${color}06` }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
          {label}
        </span>
      </div>
      {tasks.map((task, i) => {
        const priorityConfig = TASK_PRIORITIES[task.priority];
        return (
          <div
            key={task.id || i}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/50"
            style={{
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            {/* Priority dot */}
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: priorityConfig?.color || "#717478" }}
            />

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate" style={{ color: "var(--text-color)" }}>
                {task.title}
              </p>
            </div>

            {/* Due date */}
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {task.due_date ? formatRelativeDate(task.due_date) : "No date"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
