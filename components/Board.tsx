"use client";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
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
  CalendarDays,
  CheckSquare,
  GripVertical,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Pin,
} from "lucide-react";
import { useState } from "react";
import {
  Column,
  Project,
  progress,
  dateLabel,
  today,
  deadlineState,
} from "@/lib/types";
import { PriorityBadge, ProgressBar, Mutate, Modal, Field } from "./ui";
export function ProjectCard({
  project: p,
  onOpen,
}: {
  project: Project;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id, data: { columnId: p.columnId } });
  const deadline = deadlineState(p.dueDate, progress(p) === 100);
  const completed = p.tasks.filter((t) => t.status === "Done").length;
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className="project-card"
    >
      <div className="card-top">
        <span
          className={`category cat-${p.category.name.replaceAll(" ", "").toLowerCase()}`}
        >
          {p.category.name}
        </span>
        <div className="row">
          {p.pinned && <Pin size={12} />}
          <button
            {...attributes}
            {...listeners}
            className="drag-handle"
            aria-label={`Move ${p.name}`}
          >
            <GripVertical size={15} />
          </button>
        </div>
      </div>
      <button className="card-title" onClick={() => onOpen(p.id)}>
        {p.name}
      </button>
      <p className="card-description">{p.description}</p>
      <div className="tag-row">
        {p.tags.slice(0, 3).map((t) => (
          <span key={t.id}>#{t.name}</span>
        ))}
      </div>
      <div className="progress-label">
        <span>Progress</span>
        <b>{progress(p)}%</b>
      </div>
      <ProgressBar value={progress(p)} />
      <div className="card-bottom">
        <span title={deadline.label} className={deadline.className}>
          <CalendarDays size={13} />
          {deadline.className === "due-today" ? "Today" : dateLabel(p.dueDate)}
        </span>
        <span
          title={`${completed} complete, ${p.tasks.length - completed} remaining`}
        >
          <CheckSquare size={13} />
          {completed}/{p.tasks.length}
        </span>
        <PriorityBadge value={p.priority} />
      </div>
      <div className="card-detail">
        {p.column.name} · Updated{" "}
        {new Date(p.updatedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </div>
    </article>
  );
}
function KanbanColumn({
  column: c,
  projects,
  onOpen,
  onAdd,
  onEdit,
  mutate,
}: {
  column: Column;
  projects: Project[];
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  onEdit: (c: Column) => void;
  mutate: Mutate;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: c.id });
  return (
    <section
      ref={setNodeRef}
      className={`kanban-column ${c.collapsed ? "collapsed" : ""} ${isOver ? "drag-over" : ""}`}
    >
      <div className="column-heading">
        <button
          className="column-name"
          onClick={() =>
            mutate("column", "update", c.id, { collapsed: !c.collapsed })
          }
        >
          <i style={{ background: c.color }} />
          {c.collapsed ? <ChevronRight size={15} /> : c.name}
          <span className="count">
            {projects.length}
            {c.wip ? ` / ${c.wip}` : ""}
          </span>
        </button>
        <button
          className="icon-button"
          aria-label={`Edit ${c.name} column`}
          onClick={() => onEdit(c)}
        >
          <MoreHorizontal size={17} />
        </button>
      </div>
      {!c.collapsed && (
        <>
          {c.wip > 0 && projects.length > c.wip && (
            <small className="overdue">Work in progress limit exceeded</small>
          )}
          <SortableContext items={projects.map((p) => p.id)}>
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onOpen={onOpen} />
            ))}
          </SortableContext>
          <button className="add-project" onClick={() => onAdd(c.id)}>
            <Plus size={15} /> Add project
          </button>
        </>
      )}
    </section>
  );
}
export default function Board({
  columns,
  projects,
  onOpen,
  onAdd,
  mutate,
}: {
  columns: Column[];
  projects: Project[];
  onOpen: (id: string) => void;
  onAdd: (id: string) => void;
  mutate: Mutate;
}) {
  const [editing, setEditing] = useState<Column | Partial<Column> | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: laneKeyboardCoordinates(columns.map((c) => c.id)),
    }),
  );
  async function end(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const active = projects.find((p) => p.id === e.active.id);
    const target = projects.find((p) => p.id === e.over!.id);
    const columnId =
      target?.columnId || columns.find((c) => c.id === e.over!.id)?.id;
    if (!active || !columnId) return;
    const items = projects.filter((p) => p.id !== active.id);
    const index = target
      ? items.findIndex((p) => p.id === target.id)
      : items.length;
    items.splice(index, 0, { ...active, columnId });
    await mutate("reorder", "update", undefined, {
      projectId: active.id,
      kind: "project",
      items: items.map((p, position) => ({
        id: p.id,
        position,
        columnId: p.columnId,
      })),
    });
  }
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={boardCollision}
        onDragEnd={end}
      >
        <div className="board">
          {columns.map((c) => (
            <KanbanColumn
              key={c.id}
              column={c}
              projects={projects.filter((p) => p.columnId === c.id)}
              onOpen={onOpen}
              onAdd={onAdd}
              onEdit={setEditing}
              mutate={mutate}
            />
          ))}
          <button
            className="new-column"
            onClick={() =>
              setEditing({
                name: "",
                color: "#8070dc",
                position: columns.length,
                wip: 0,
              })
            }
          >
            <Plus size={16} /> Add column
          </button>
        </div>
      </DndContext>
      {editing && (
        <Modal
          title={editing.id ? "Column settings" : "New column"}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await mutate(
                  "column",
                  editing.id ? "update" : "create",
                  editing.id,
                  {
                    name: f.get("name"),
                    color: f.get("color"),
                    wip: Number(f.get("wip")),
                    position: editing.position,
                  },
                )
              )
                setEditing(null);
            }}
          >
            <Field label="Name">
              <input name="name" required defaultValue={editing.name} />
            </Field>
            <Field label="Color">
              <input name="color" type="color" defaultValue={editing.color} />
            </Field>
            <Field label="WIP limit (0 for unlimited)">
              <input
                name="wip"
                type="number"
                min="0"
                defaultValue={editing.wip}
              />
            </Field>
            <div className="form-actions">
              {editing.id && (
                <button
                  type="button"
                  className="danger"
                  onClick={async () => {
                    if (
                      confirm("Delete this empty column?") &&
                      (await mutate("column", "delete", editing.id))
                    )
                      setEditing(null);
                  }}
                >
                  Delete column
                </button>
              )}
              <button className="primary">Save column</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
