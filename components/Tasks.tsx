"use client";
import { useState } from "react";
import { Check, Plus, Trash2, GripVertical, ChevronDown } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { laneKeyboardCoordinates } from "@/lib/keyboard-drag";
import { boardCollision } from "@/lib/drag-collision";
import { CSS } from "@dnd-kit/utilities";
import {
  Data,
  Task,
  statuses,
  priorities,
  dateLabel,
  today,
} from "@/lib/types";
import { Empty, Mutate, PriorityBadge } from "./ui";
function TaskRow({
  task: t,
  project,
  mutate,
  onEdit,
  onOpen,
}: {
  task: Task;
  project: string;
  mutate: Mutate;
  onEdit: (t: Task) => void;
  onOpen?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sub, setSub] = useState("");
  return (
    <div className="task-wrap">
      <div className="task-row">
        <button
          aria-label={`Complete ${t.title}`}
          className={`task-check ${t.status === "Done" ? "checked" : ""}`}
          onClick={() =>
            mutate("task", "update", t.id, {
              status: t.status === "Done" ? "To Do" : "Done",
            })
          }
        >
          {t.status === "Done" && <Check size={13} />}
        </button>
        <button
          className={`task-title ${t.status === "Done" ? "struck" : ""}`}
          onClick={() => onEdit(t)}
        >
          {t.title}
          <small
            onClick={(e) => {
              e.stopPropagation();
              onOpen?.();
            }}
          >
            {project}
          </small>
        </button>
        <PriorityBadge value={t.priority} />
        <span
          className={
            t.dueDate && t.dueDate < today() && t.status !== "Done"
              ? "overdue"
              : "muted"
          }
        >
          {dateLabel(t.dueDate)}
        </span>
        <select
          aria-label={`Status for ${t.title}`}
          value={t.status}
          onChange={(e) =>
            mutate("task", "update", t.id, { status: e.target.value })
          }
        >
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label={`Subtasks for ${t.title}`}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={16} />
        </button>
        <button
          className="icon-button danger"
          aria-label={`Delete ${t.title}`}
          onClick={() => {
            if (confirm("Delete this task and its subtasks?"))
              mutate("task", "delete", t.id);
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      {expanded && (
        <div className="subtasks">
          {t.subtasks.map((s) => (
            <div className="row" key={s.id}>
              <input
                aria-label={s.title}
                type="checkbox"
                checked={s.completed}
                onChange={(e) =>
                  mutate("subtask", "update", s.id, {
                    completed: e.target.checked,
                  })
                }
              />
              <span className={s.completed ? "struck" : ""}>{s.title}</span>
              <button
                className="icon-button"
                aria-label={`Delete subtask ${s.title}`}
                onClick={() => {
                  if (confirm("Delete this subtask?"))
                    mutate("subtask", "delete", s.id);
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <form
            className="row"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await mutate("subtask", "create", undefined, {
                  taskId: t.id,
                  title: sub,
                })
              )
                setSub("");
            }}
          >
            <input
              placeholder="Add a subtask…"
              required
              value={sub}
              onChange={(e) => setSub(e.target.value)}
            />
            <button>
              <Plus size={15} />
            </button>
          </form>
          {t.notes && <p>{t.notes}</p>}
          <small className="muted">
            Created {new Date(t.createdAt).toLocaleDateString()}{" "}
            {t.completedAt &&
              ` · Completed ${new Date(t.completedAt).toLocaleDateString()}`}
          </small>
        </div>
      )}
    </div>
  );
}
function SortableTask({
  task,
  onEdit,
}: {
  task: Task;
  onEdit: (t: Task) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: task.id, data: { lane: task.status } });
  return (
    <div
      ref={setNodeRef}
      className="mini-task"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        {...attributes}
        {...listeners}
        className="drag-handle"
        aria-label={`Move task ${task.title}`}
      >
        <GripVertical size={15} />
      </button>
      <button className="text-button" onClick={() => onEdit(task)}>
        {task.title}
      </button>
      <PriorityBadge value={task.priority} />
    </div>
  );
}
function TaskLane({
  status,
  tasks,
  onEdit,
}: {
  status: string;
  tasks: Task[];
  onEdit: (t: Task) => void;
}) {
  const { setNodeRef } = useDroppable({ id: status });
  return (
    <section className="task-lane" ref={setNodeRef}>
      <h4>
        {status} <span className="count">{tasks.length}</span>
      </h4>
      <SortableContext items={tasks.map((t) => t.id)}>
        {tasks.map((t) => (
          <SortableTask task={t} onEdit={onEdit} key={t.id} />
        ))}
      </SortableContext>
    </section>
  );
}
export default function Tasks({
  data,
  projectId,
  mutate,
  onEdit,
  onAdd,
  onOpen,
}: {
  data: Data;
  projectId?: string;
  mutate: Mutate;
  onEdit: (t: Task) => void;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const [view, setView] = useState("All Tasks");
  const [filter, setFilter] = useState({
    project: "",
    priority: "",
    status: "",
    category: "",
    tag: "",
    due: "",
  });
  const [sort, setSort] = useState("Deadline");
  const [board, setBoard] = useState(false);
  const all = data.projects
    .filter((p) => (projectId ? p.id === projectId : !p.archived))
    .flatMap((p) =>
      p.tasks.map((t) => ({
        ...t,
        projectName: p.name,
        projectCategory: p.category.name,
      })),
    );
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const weekDate = week.toISOString().slice(0, 10);
  const tasks = all
    .filter(
      (t) =>
        (!filter.project || t.projectId === filter.project) &&
        (!filter.priority || t.priority === filter.priority) &&
        (!filter.status || t.status === filter.status) &&
        (!filter.category ||
          t.category === filter.category ||
          t.projectCategory === filter.category) &&
        (!filter.tag ||
          t.tags.some((tag) =>
            tag.name.toLowerCase().includes(filter.tag.toLowerCase()),
          )) &&
        (!filter.due || t.dueDate === filter.due) &&
        (view === "All Tasks" ||
          (view === "Completed" && t.status === "Done") ||
          (t.status !== "Done" &&
            ((view === "Today" && t.dueDate === today()) ||
              (view === "This Week" &&
                t.dueDate >= today() &&
                t.dueDate <= weekDate) ||
              (view === "Overdue" && !!t.dueDate && t.dueDate < today())))),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === "Project"
          ? a.projectName.localeCompare(b.projectName)
          : sort === "Date created"
            ? b.createdAt.localeCompare(a.createdAt)
            : sort === "Last updated"
              ? b.updatedAt.localeCompare(a.updatedAt)
              : (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
    );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: laneKeyboardCoordinates(statuses),
    }),
  );
  async function drop(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const active = all.find((t) => t.id === e.active.id);
    const target = all.find((t) => t.id === e.over!.id);
    const status = target?.status || String(e.over.id);
    if (!active || !statuses.includes(status)) return;
    const items = all.filter((t) => t.id !== active.id);
    items.splice(
      target ? items.findIndex((t) => t.id === target.id) : items.length,
      0,
      { ...active, status },
    );
    await mutate("reorder", "update", undefined, {
      kind: "task",
      projectId: active.projectId,
      items: items.map((t, position) => ({
        id: t.id,
        position,
        status: t.status,
      })),
    });
  }
  return (
    <>
      <div className="section-toolbar">
        <div className="tabs">
          {["All Tasks", "Today", "This Week", "Overdue", "Completed"].map(
            (v) => (
              <button
                className={view === v ? "active" : ""}
                key={v}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ),
          )}
        </div>
        <button className="primary" onClick={onAdd}>
          <Plus size={15} /> Add task
        </button>
      </div>
      <div className="filters wrap">
        {!projectId && (
          <select
            aria-label="Filter task project"
            value={filter.project}
            onChange={(e) => setFilter({ ...filter, project: e.target.value })}
          >
            <option value="">All projects</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Filter task priority"
          value={filter.priority}
          onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Filter task status"
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filter task category"
          value={filter.category}
          onChange={(e) => setFilter({ ...filter, category: e.target.value })}
        >
          <option value="">All categories</option>
          {data.categories.map((c) => (
            <option key={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          aria-label="Filter task tag"
          placeholder="Tag…"
          value={filter.tag}
          onChange={(e) => setFilter({ ...filter, tag: e.target.value })}
        />
        <input
          aria-label="Filter task deadline"
          type="date"
          value={filter.due}
          onChange={(e) => setFilter({ ...filter, due: e.target.value })}
        />
        <select
          aria-label="Sort tasks"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {[
            "Deadline",
            "Priority",
            "Project",
            "Date created",
            "Last updated",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => setBoard(!board)}>
          {board ? "List view" : "Board view"}
        </button>
      </div>
      {board ? (
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollision}
          onDragEnd={drop}
        >
          <div className="task-board">
            {statuses.map((s) => (
              <TaskLane
                key={s}
                status={s}
                tasks={tasks
                  .filter((t) => t.status === s)
                  .sort((a, b) => a.position - b.position)}
                onEdit={onEdit}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="task-list">
          {tasks.length ? (
            tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={projectId ? "" : t.projectName}
                mutate={mutate}
                onEdit={onEdit}
                onOpen={() => onOpen(t.projectId)}
              />
            ))
          ) : (
            <Empty>No tasks here. A little breathing room.</Empty>
          )}
        </div>
      )}
    </>
  );
}
