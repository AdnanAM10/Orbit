"use client";
import { useState } from "react";
import { Data, Project, Task, priorities, statuses, today } from "@/lib/types";
import { Field, Modal, Mutate } from "./ui";
export function ProjectForm({
  data,
  project,
  columnId,
  onClose,
  mutate,
}: {
  data: Data;
  project?: Project;
  columnId?: string;
  onClose: () => void;
  mutate: Mutate;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={project ? "Edit project" : "Make room for your next idea"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const v = Object.fromEntries(new FormData(e.currentTarget));
          const ok = await mutate(
            "project",
            project ? "update" : "create",
            project?.id,
            {
              ...v,
              autoProgress: v.autoProgress === "on",
              progress: Number(v.progress || 0),
            },
          );
          setBusy(false);
          if (ok) onClose();
        }}
      >
        <p className="muted">
          Every great project starts with a little clarity.
        </p>
        <Field label="Project name">
          <input
            name="name"
            required
            maxLength={150}
            defaultValue={project?.name}
            placeholder="What are you working on?"
            autoFocus
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            defaultValue={project?.description}
            placeholder="The big picture, in a few words…"
          />
        </Field>
        <div className="form-grid">
          <Field label="Category">
            <select
              name="categoryId"
              defaultValue={project?.categoryId || data.categories[0]?.id}
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              name="priority"
              defaultValue={project?.priority || "Medium"}
            >
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="columnId"
              defaultValue={
                project?.columnId || columnId || data.columns[0]?.id
              }
            >
              {data.columns.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              name="startDate"
              defaultValue={project?.startDate || today()}
            />
          </Field>
          <Field label="Deadline">
            <input type="date" name="dueDate" defaultValue={project?.dueDate} />
          </Field>
          <Field label="Manual progress (%)">
            <input
              name="progress"
              type="number"
              min="0"
              max="100"
              defaultValue={project?.progress || 0}
            />
          </Field>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            name="autoProgress"
            defaultChecked={project?.autoProgress ?? true}
          />{" "}
          Calculate progress from completed tasks
        </label>
        <Field label="Tags (comma separated)">
          <input
            name="tags"
            defaultValue={project?.tags.map((t) => t.name).join(", ")}
            placeholder="research, docker, personal"
          />
        </Field>
        {!project && (
          <>
            <Field label="Starter tasks (one per line)">
              <textarea
                name="starterTasks"
                placeholder="Define the scope&#10;Create a first draft"
              />
            </Field>
            <Field label="Initial notes">
              <textarea
                name="initialNotes"
                placeholder="Markdown is supported"
              />
            </Field>
          </>
        )}
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TaskForm({
  data,
  task,
  projectId,
  onClose,
  mutate,
}: {
  data: Data;
  task?: Task;
  projectId?: string;
  onClose: () => void;
  mutate: Mutate;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={task ? "Edit task" : "One step closer"} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const v = Object.fromEntries(new FormData(e.currentTarget));
          const ok = await mutate(
            "task",
            task ? "update" : "create",
            task?.id,
            {
              ...v,
              estimatedHours: Number(v.estimatedHours || 0),
              actualHours: Number(v.actualHours || 0),
            },
          );
          setBusy(false);
          if (ok) onClose();
        }}
      >
        <Field label="Task title">
          <input name="title" required defaultValue={task?.title} autoFocus />
        </Field>
        <Field label="Project">
          <select name="projectId" defaultValue={task?.projectId || projectId}>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea name="description" defaultValue={task?.description} />
        </Field>
        <div className="form-grid">
          <Field label="Status">
            <select name="status" defaultValue={task?.status || "To Do"}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue={task?.priority || "Medium"}>
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" name="dueDate" defaultValue={task?.dueDate} />
          </Field>
          <Field label="Category">
            <input
              name="category"
              defaultValue={task?.category}
              list="task-cats"
            />
            <datalist id="task-cats">
              {data.categories.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </datalist>
          </Field>
          <Field label="Estimated hours">
            <input
              type="number"
              min="0"
              step="0.25"
              name="estimatedHours"
              defaultValue={task?.estimatedHours || 0}
            />
          </Field>
          <Field label="Actual hours">
            <input
              type="number"
              min="0"
              step="0.25"
              name="actualHours"
              defaultValue={task?.actualHours || 0}
            />
          </Field>
        </div>
        <Field label="Tags">
          <input
            name="tags"
            defaultValue={task?.tags.map((t) => t.name).join(", ")}
          />
        </Field>
        <Field label="Notes">
          <textarea name="notes" defaultValue={task?.notes} />
        </Field>
        <div className="form-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
