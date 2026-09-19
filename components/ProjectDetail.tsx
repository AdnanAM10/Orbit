"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Pencil,
  Pin,
  Archive,
  Trash2,
  Plus,
  CalendarDays,
  Flag,
} from "lucide-react";
import {
  Data,
  Project,
  Task,
  Note,
  Milestone,
  progress,
  dateLabel,
} from "@/lib/types";
import { Mutate, PriorityBadge, ProgressBar, Modal, Field, Empty } from "./ui";
import Tasks from "./Tasks";
export function ItemForm({
  kind,
  projectId,
  item,
  onClose,
  mutate,
}: {
  kind: "note" | "milestone";
  projectId: string;
  item?: Note | Milestone;
  onClose: () => void;
  mutate: Mutate;
}) {
  const [busy, setBusy] = useState(false);
  const note = item as Note | undefined;
  const milestone = item as Milestone | undefined;
  return (
    <Modal title={`${item ? "Edit" : "New"} ${kind}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = Object.fromEntries(new FormData(e.currentTarget));
          const ok = await mutate(kind, item ? "update" : "create", item?.id, {
            ...f,
            projectId,
            ...(kind === "milestone" ? { progress: Number(f.progress) } : {}),
          });
          setBusy(false);
          if (ok) onClose();
        }}
      >
        {kind === "note" ? (
          <>
            <Field label="Title">
              <input name="title" required defaultValue={note?.title} />
            </Field>
            <Field label="Content · Markdown supported">
              <textarea
                className="note-editor"
                name="content"
                defaultValue={note?.content}
                placeholder={
                  "# A fresh page\n\n- [ ] Your next step\n\n```sh\nnpm run dev\n```"
                }
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Name">
              <input name="name" required defaultValue={milestone?.name} />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                defaultValue={milestone?.description}
              />
            </Field>
            <Field label="Target date">
              <input
                type="date"
                name="dueDate"
                defaultValue={milestone?.dueDate}
              />
            </Field>
            <Field label="Status">
              <select name="status" defaultValue={milestone?.status}>
                {["Upcoming", "In Progress", "Completed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Completion %">
              <input
                type="number"
                min="0"
                max="100"
                name="progress"
                defaultValue={milestone?.progress || 0}
              />
            </Field>
          </>
        )}
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save {kind}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function ProjectDetail({
  project: p,
  data,
  mutate,
  onBack,
  onEdit,
  onTask,
  onOpen,
}: {
  project: Project;
  data: Data;
  mutate: Mutate;
  onBack: () => void;
  onEdit: () => void;
  onTask: (t?: Task) => void;
  onOpen: (id: string) => void;
}) {
  const [tab, setTab] = useState("Tasks");
  const [item, setItem] = useState<{
    kind: "note" | "milestone";
    value?: Note | Milestone;
  } | null>(null);
  return (
    <>
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> All projects
      </button>
      <div className="detail-header">
        <div>
          <div className="eyebrow">{p.category.name} / PROJECT WORKSPACE</div>
          <h1>{p.name}</h1>
          <p className="muted">{p.description}</p>
        </div>
        <div className="row">
          <button
            onClick={() =>
              mutate("project", "update", p.id, { pinned: !p.pinned })
            }
            aria-label="Pin project"
            className={p.pinned ? "selected" : ""}
          >
            <Pin size={16} />
          </button>
          <button onClick={onEdit}>
            <Pencil size={15} /> Edit project
          </button>
          <button
            aria-label={p.archived ? "Restore project" : "Archive project"}
            onClick={async () => {
              await mutate("project", "update", p.id, {
                archived: !p.archived,
              });
            }}
          >
            <Archive size={16} />
          </button>
          <button
            className="danger"
            aria-label="Delete project"
            onClick={async () => {
              if (
                confirm(
                  "Permanently delete this project, all tasks, notes, and milestones?",
                ) &&
                (await mutate("project", "delete", p.id))
              )
                onBack();
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="detail-summary">
        <div>
          <small>Status</small>
          <select
            aria-label="Project status"
            value={p.columnId}
            onChange={(e) =>
              mutate("project", "update", p.id, { columnId: e.target.value })
            }
          >
            {data.columns.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <small>Priority</small>
          <PriorityBadge value={p.priority} />
        </div>
        <div>
          <small>Timeline</small>
          <span>
            <CalendarDays size={14} /> {dateLabel(p.startDate)} —{" "}
            {dateLabel(p.dueDate)}
          </span>
        </div>
        <div>
          <small>Completion · {progress(p)}%</small>
          <ProgressBar value={progress(p)} />
        </div>
        <div>
          <small>Tags</small>
          <div className="tag-row">
            {p.tags.map((t) => (
              <span key={t.id}>#{t.name}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="tabs detail-tabs">
        {["Tasks", "Notes", "Milestones", "Activity"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}{" "}
            <span className="count">
              {t === "Tasks"
                ? p.tasks.length
                : t === "Notes"
                  ? p.notes.length
                  : t === "Milestones"
                    ? p.milestones.length
                    : ""}
            </span>
          </button>
        ))}
      </div>
      {tab === "Tasks" && (
        <Tasks
          data={data}
          projectId={p.id}
          mutate={mutate}
          onEdit={onTask}
          onAdd={() => onTask()}
          onOpen={onOpen}
        />
      )}{" "}
      {tab === "Notes" && (
        <>
          <div className="section-toolbar">
            <p className="muted">
              Ideas, decisions, and the details worth keeping.
            </p>
            <button
              className="primary"
              onClick={() => setItem({ kind: "note" })}
            >
              <Plus size={15} /> Add note
            </button>
          </div>
          <div className="notes-grid">
            {p.notes.map((n) => (
              <article className="panel note" key={n.id}>
                <div className="section-toolbar">
                  <h3>{n.title}</h3>
                  <div className="row">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${n.title}`}
                      onClick={() => setItem({ kind: "note", value: n })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Delete ${n.title}`}
                      onClick={() => {
                        if (confirm("Delete this note?"))
                          mutate("note", "delete", n.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {n.content}
                  </ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
          {!p.notes.length && (
            <Empty>A fresh page for your next idea. Add your first note.</Empty>
          )}
        </>
      )}
      {tab === "Milestones" && (
        <>
          <div className="section-toolbar">
            <p className="muted">The meaningful moments along the way.</p>
            <button
              className="primary"
              onClick={() => setItem({ kind: "milestone" })}
            >
              <Plus size={15} /> Add milestone
            </button>
          </div>
          <div className="timeline">
            {[...p.milestones]
              .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              .map((m) => (
                <article className="panel milestone" key={m.id}>
                  <div className="milestone-marker">
                    <Flag size={18} />
                  </div>
                  <div className="grow">
                    <div className="section-toolbar">
                      <div>
                        <small className="eyebrow">
                          {dateLabel(m.dueDate)} · {m.status}
                        </small>
                        <h3>{m.name}</h3>
                      </div>
                      <div className="row">
                        <button
                          onClick={() =>
                            setItem({ kind: "milestone", value: m })
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`Delete ${m.name}`}
                          onClick={() => {
                            if (confirm("Delete this milestone?"))
                              mutate("milestone", "delete", m.id);
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <p className="muted">{m.description}</p>
                    <div className="progress-label">
                      <span>Completion</span>
                      <b>{m.progress}%</b>
                    </div>
                    <ProgressBar value={m.progress} />
                  </div>
                </article>
              ))}
          </div>
          {!p.milestones.length && (
            <Empty>Set a milestone to give your project a destination.</Empty>
          )}
        </>
      )}
      {tab === "Activity" && (
        <div className="panel">
          {data.activities
            .filter((a) => a.projectId === p.id)
            .map((a) => (
              <div className="activity-row" key={a.id}>
                <i />
                <div>
                  <b>{a.action}</b>
                  <p>{a.metadata}</p>
                </div>
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </div>
            ))}
        </div>
      )}
      {item && (
        <ItemForm
          kind={item.kind}
          item={item.value}
          projectId={p.id}
          mutate={mutate}
          onClose={() => setItem(null)}
        />
      )}
    </>
  );
}
