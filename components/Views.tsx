"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Check,
  Flag,
} from "lucide-react";
import {
  Data,
  Project,
  progress,
  today,
  dateLabel,
  priorities,
} from "@/lib/types";
import { Empty, Mutate, Field } from "./ui";
export function ActivityFeed({
  data,
  onOpen,
}: {
  data: Data;
  onOpen: (id: string) => void;
}) {
  return (
    <section className="panel activity-panel">
      <div className="section-toolbar">
        <h3>Recent activity</h3>
        <span className="muted">Your momentum, at a glance</span>
      </div>
      {data.activities.slice(0, 5).map((a, i) => (
        <button
          className="activity-row"
          key={a.id}
          disabled={!a.projectId}
          onClick={() => a.projectId && onOpen(a.projectId)}
        >
          <span className={`activity-icon tone-${i % 3}`}>
            <Check size={14} />
          </span>
          <div>
            <b>{a.metadata || a.action}</b>
            <p>{a.action}</p>
          </div>
          <small>
            {new Date(a.createdAt).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </small>
        </button>
      ))}
      {!data.activities.length && (
        <Empty>Your next step starts the story.</Empty>
      )}
    </section>
  );
}
export function Upcoming({
  projects,
  onOpen,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
}) {
  const items = projects
    .filter((p) => p.dueDate && progress(p) < 100 && !p.archived)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
  return (
    <section className="panel">
      <div className="section-toolbar">
        <h3>On the horizon</h3>
        <Flag size={16} className="muted" />
      </div>
      {items.map((p) => (
        <button
          className="deadline-row"
          key={p.id}
          onClick={() => onOpen(p.id)}
        >
          <span className={`date-tile ${p.dueDate < today() ? "late" : ""}`}>
            <small>
              {new Date(p.dueDate + "T12:00").toLocaleDateString("en-US", {
                month: "short",
              })}
            </small>
            <b>{new Date(p.dueDate + "T12:00").getDate()}</b>
          </span>
          <div>
            <b>{p.name}</b>
            <small>
              {p.dueDate < today()
                ? "Overdue"
                : p.dueDate === today()
                  ? "Due today"
                  : p.category.name}
            </small>
          </div>
          <ArrowUpRight size={15} />
        </button>
      ))}
      {!items.length && <Empty>Nothing on the horizon yet.</Empty>}
    </section>
  );
}
export function CalendarView({
  data,
  onOpen,
}: {
  data: Data;
  onOpen: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState("Month");
  const events = data.projects
    .filter((p) => !p.archived)
    .flatMap((p) => [
      {
        id: p.id,
        projectId: p.id,
        title: p.name,
        date: p.dueDate,
        type: "Project",
      },
      ...p.tasks
        .filter((t) => t.status !== "Done")
        .map((t) => ({
          id: t.id,
          projectId: p.id,
          title: t.title,
          date: t.dueDate,
          type: "Task",
        })),
      ...p.milestones.map((m) => ({
        id: m.id,
        projectId: p.id,
        title: m.name,
        date: m.dueDate,
        type: "Milestone",
      })),
    ])
    .filter((e) => e.date);
  const start =
    mode === "Week"
      ? new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate() - cursor.getDay(),
        )
      : new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  if (mode !== "Week") start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: mode === "Week" ? 7 : 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const visible = events
    .filter((e) =>
      mode === "Agenda"
        ? e.date.startsWith(
            `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
          )
        : true,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="section-toolbar calendar-toolbar">
        <div className="row">
          <h2>
            {cursor.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            className="icon-button"
            aria-label="Previous period"
            onClick={() =>
              setCursor(
                new Date(
                  cursor.getFullYear(),
                  cursor.getMonth() - (mode === "Week" ? 0 : 1),
                  mode === "Week" ? cursor.getDate() - 7 : 1,
                ),
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Next period"
            onClick={() =>
              setCursor(
                new Date(
                  cursor.getFullYear(),
                  cursor.getMonth() + (mode === "Week" ? 0 : 1),
                  mode === "Week" ? cursor.getDate() + 7 : 1,
                ),
              )
            }
          >
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setCursor(new Date())}>Today</button>
        </div>
        <div className="segmented">
          {["Month", "Week", "Agenda"].map((m) => (
            <button
              className={mode === m ? "active" : ""}
              key={m}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {mode === "Agenda" ? (
        <div className="panel">
          {visible.map((e) => (
            <button
              key={e.type + e.id}
              className="deadline-row"
              onClick={() => onOpen(e.projectId)}
            >
              <span className="date-tile">{dateLabel(e.date)}</span>
              <div>
                <b>{e.title}</b>
                <small>{e.type}</small>
              </div>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {!visible.length && <Empty>No deadlines this month.</Empty>}
        </div>
      ) : (
        <div className={`calendar-grid ${mode === "Week" ? "week" : ""}`}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {days.map((d) => (
            <div
              className={`calendar-day ${d.getMonth() !== cursor.getMonth() ? "outside" : ""}`}
              key={key(d)}
            >
              <span className={key(d) === today() ? "today" : ""}>
                {d.getDate()}
              </span>
              {events
                .filter((e) => e.date === key(d))
                .map((e) => (
                  <button
                    className={`calendar-event event-${e.type.toLowerCase()}`}
                    key={e.type + e.id}
                    title={`${e.type}: ${e.title}`}
                    onClick={() => onOpen(e.projectId)}
                  >
                    {e.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function Analytics({ data }: { data: Data }) {
  const projects = data.projects.filter((p) => !p.archived);
  const tasks = projects.flatMap((p) => p.tasks);
  const done = tasks.filter((t) => t.status === "Done");
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - (7 - i) * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      label: start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: done.filter(
        (t) =>
          t.completedAt &&
          new Date(t.completedAt) >= start &&
          new Date(t.completedAt) <= end,
      ).length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.value));
  const groups = [
    {
      title: "Projects by category",
      items: data.categories.map((c) => ({
        label: c.name,
        value: projects.filter((p) => p.categoryId === c.id).length,
      })),
    },
    {
      title: "Projects by status",
      items: data.columns.map((c) => ({
        label: c.name,
        value: projects.filter((p) => p.columnId === c.id).length,
      })),
    },
    {
      title: "Projects by priority",
      items: priorities.map((priority) => ({
        label: priority,
        value: projects.filter((p) => p.priority === priority).length,
      })),
    },
  ];
  return (
    <>
      <div className="stats-grid analytics-stats">
        {[
          [
            "Projects completed",
            projects.filter((p) => p.column.name === "Completed").length,
          ],
          [
            "Currently active",
            projects.filter((p) => p.column.name !== "Completed").length,
          ],
          ["Tasks completed", done.length],
          ["Tasks remaining", tasks.length - done.length],
          [
            "Overdue tasks",
            tasks.filter(
              (t) => t.dueDate && t.dueDate < today() && t.status !== "Done",
            ).length,
          ],
          [
            "Average completion",
            `${projects.length ? Math.round(projects.reduce((a, p) => a + progress(p), 0) / projects.length) : 0}%`,
          ],
        ].map(([label, value]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>Small steps. Real progress.</h3>
        <p className="muted">Tasks completed in each of the last eight weeks</p>
        <div className="bar-chart">
          {weeks.map((w) => (
            <div className="chart-bar" key={w.label}>
              <b>{w.value}</b>
              <div
                style={{ height: `${Math.max(2, (w.value / max) * 160)}px` }}
              />
              <small>{w.label}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="analytics-groups">
        {groups.map((g) => (
          <section className="panel" key={g.title}>
            <h3>{g.title}</h3>
            {g.items
              .filter((i) => i.value > 0)
              .map((i) => (
                <div className="horizontal-bar" key={i.label}>
                  <div>
                    <span>{i.label}</span>
                    <b>{i.value}</b>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${(i.value / Math.max(projects.length, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
          </section>
        ))}
      </div>
    </>
  );
}
export function Settings({
  data,
  mutate,
  theme,
  onTheme,
}: {
  data: Data;
  mutate: Mutate;
  theme: string;
  onTheme: (t: string) => void;
}) {
  const [category, setCategory] = useState("");
  return (
    <div className="settings-grid">
      <section className="panel">
        <h3>Make yourself at home</h3>
        <p className="muted">
          Your preferences are remembered on this browser.
        </p>
        <Field label="Appearance">
          <select value={theme} onChange={(e) => onTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <h3>Project categories</h3>
        <div className="tag-row">
          {data.categories.map((c) => (
            <span key={c.id}>{c.name}</span>
          ))}
        </div>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await mutate("category", "create", undefined, { name: category })
            )
              setCategory("");
          }}
        >
          <input
            required
            placeholder="Add a custom category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <button className="primary">Add</button>
        </form>
      </section>
      <section className="panel">
        <h3>Your data belongs to you</h3>
        <p className="muted">
          Projects, tasks, notes, and milestones are stored in your local SQLite
          database. Download a readable JSON snapshot anytime.
        </p>
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = `orbit-${today()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export workspace JSON
        </button>
        <h3 className="spaced">Keyboard shortcuts</h3>
        <p className="shortcut-row">
          Search anything <kbd>Ctrl / ⌘ K</kbd>
        </p>
        <p className="shortcut-row">
          Close a dialog <kbd>Esc</kbd>
        </p>
        <p className="muted">
          To move a card with your keyboard, focus its grip, press Space, use
          the arrow keys, then press Space again.
        </p>
      </section>
    </div>
  );
}
