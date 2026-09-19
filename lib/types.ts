export type Tag = { id: string; name: string };
export type Column = {
  id: string;
  name: string;
  color: string;
  position: number;
  collapsed: boolean;
  wip: number;
};
export type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  notes: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  position: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  tags: Tag[];
  subtasks: { id: string; title: string; completed: boolean }[];
};
export type Note = {
  id: string;
  projectId: string;
  title: string;
  content: string;
};
export type Milestone = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dueDate: string;
  status: string;
  progress: number;
};
export type Project = {
  id: string;
  name: string;
  description: string;
  columnId: string;
  column: Column;
  categoryId: string;
  category: { id: string; name: string };
  priority: string;
  progress: number;
  autoProgress: boolean;
  startDate: string;
  dueDate: string;
  archived: boolean;
  pinned: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  tasks: Task[];
  notes: Note[];
  milestones: Milestone[];
};
export type Data = {
  projects: Project[];
  columns: Column[];
  categories: { id: string; name: string }[];
  activities: {
    id: string;
    projectId: string | null;
    action: string;
    metadata: string;
    createdAt: string;
  }[];
};
export const statuses = [
  "Backlog",
  "To Do",
  "In Progress",
  "Blocked",
  "Review",
  "Done",
];
export const priorities = ["Low", "Medium", "High", "Critical"];
export const progress = (p: Project) =>
  p.autoProgress
    ? p.tasks.length
      ? Math.round(
          (p.tasks.filter((t) => t.status === "Done").length / p.tasks.length) *
            100,
        )
      : 0
    : p.progress;
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dateLabel = (date: string) =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No deadline";
export const deadlineState = (date: string, complete = false) => {
  if (!date || complete) return { className: "", label: dateLabel(date) };
  const days = Math.round(
    (new Date(date + "T12:00").getTime() -
      new Date(today() + "T12:00").getTime()) /
      86400000,
  );
  return days < 0
    ? { className: "overdue", label: `${dateLabel(date)} · Overdue` }
    : days === 0
      ? { className: "due-today", label: "Due today" }
      : days <= 3
        ? {
            className: "due-soon",
            label: `${dateLabel(date)} · Due within 3 days`,
          }
        : days <= 7
          ? {
              className: "due-week",
              label: `${dateLabel(date)} · Due this week`,
            }
          : { className: "", label: dateLabel(date) };
};
