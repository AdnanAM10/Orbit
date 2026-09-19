"use client";
import { useEffect, useRef, useState } from "react";
import {
  Orbit,
  LayoutDashboard,
  Layers,
  CheckSquare,
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheck,
  Archive,
  Settings as SettingsIcon,
  Search,
  Plus,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Sun,
  Moon,
  Bell,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowDownWideNarrow,
  FolderKanban,
  Clock3,
  CircleAlert,
  Sparkles,
  Flag,
  StickyNote,
} from "lucide-react";
import { Data, Project, Task, priorities, progress, today } from "@/lib/types";
import { Modal, Empty, PriorityBadge } from "./ui";
import { ProjectForm, TaskForm } from "./Forms";
import Board from "./Board";
import Tasks from "./Tasks";
import ProjectDetail, { ItemForm } from "./ProjectDetail";
import {
  ActivityFeed,
  Upcoming,
  CalendarView,
  Analytics,
  Settings,
} from "./Views";
const navigation = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Projects", icon: Layers },
  { name: "Tasks", icon: CheckSquare },
  { name: "Calendar", icon: CalendarDays },
  { name: "Analytics", icon: ChartNoAxesCombined },
];
const emptyFilters = {
  priority: "",
  category: "",
  status: "",
  tag: "",
  deadline: "",
  completion: "",
};
export default function Workspace() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState("light");
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [sort, setSort] = useState("Manual order");
  const [list, setList] = useState(false);
  const [quick, setQuick] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [form, setForm] = useState<{
    kind: "project" | "task" | "note" | "milestone";
    project?: Project;
    task?: Task;
    columnId?: string;
    projectId?: string;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saving = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    fetch("/orbit/api/workspace")
      .then(async (r) => {
        if (!r.ok) throw Error("Unable to load your workspace");
        setData(await r.json());
      })
      .catch((e) => setError(e.message));
    const saved = localStorage.getItem("orbit-theme") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
    setCollapsed(localStorage.getItem("orbit-sidebar") === "collapsed");
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  function notify(message: string) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 4500);
  }
  async function mutate(
    entity: string,
    action: string,
    id?: string,
    payload?: Record<string, unknown>,
  ) {
    const previous = saving.current;
    let release!: () => void;
    saving.current = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const response = await fetch("/orbit/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, action, id, data: payload }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      setData(result);
      notify(
        action === "delete"
          ? "Deleted successfully"
          : entity === "reorder"
            ? "Moved successfully"
            : "Saved. A little more progress.",
      );
      return true;
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
      return false;
    } finally {
      release();
    }
  }
  function navigate(name: string) {
    setPage(name);
    setSelected(null);
    setFilters(emptyFilters);
  }
  function changeTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    localStorage.setItem("orbit-theme", value);
  }
  function open(id: string) {
    setSelected(id);
    setSearch(false);
    setNotifications(false);
  }
  if (!data)
    return (
      <div className="loading-shell">
        <div className="brand">
          <Orbit /> orbit<span className="brand-dot">.</span>
        </div>
        {error ? (
          <div className="panel">
            <p>{error}</p>
            <button onClick={() => location.reload()}>Try again</button>
          </div>
        ) : (
          <>
            <div className="skeleton title-skeleton" />
            <div className="stats-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton stat-skeleton" />
              ))}
            </div>
            <div className="skeleton board-skeleton" />
          </>
        )}
      </div>
    );
  const active = data.projects.filter((p) => !p.archived);
  const tasks = active.flatMap((p) => p.tasks);
  const done = tasks.filter((t) => t.status === "Done").length;
  const overdue = tasks.filter(
    (t) => t.status !== "Done" && t.dueDate && t.dueDate < today(),
  ).length;
  const blocked = active.filter((p) => p.column.name === "Blocked").length;
  const completion = active.length
    ? Math.round(active.reduce((s, p) => s + progress(p), 0) / active.length)
    : 0;
  const week = new Date();
  week.setDate(week.getDate() + 7);
  const upcoming = active.filter(
    (p) =>
      p.dueDate >= today() &&
      p.dueDate <= week.toISOString().slice(0, 10) &&
      progress(p) < 100,
  ).length;
  const filtered = data.projects
    .filter(
      (p) =>
        (page === "Archive" ? p.archived : !p.archived) &&
        (page !== "Completed Projects" || p.column.name === "Completed") &&
        (!filters.priority || p.priority === filters.priority) &&
        (!filters.category || p.categoryId === filters.category) &&
        (!filters.status || p.columnId === filters.status) &&
        (!filters.tag ||
          p.tags.some((t) =>
            t.name.toLowerCase().includes(filters.tag.toLowerCase()),
          )) &&
        (!filters.completion ||
          (filters.completion === "0" && progress(p) === 0) ||
          (filters.completion === "100" && progress(p) === 100) ||
          (filters.completion === "partial" &&
            progress(p) > 0 &&
            progress(p) < 100)) &&
        (!filters.deadline ||
          (!!p.dueDate &&
            progress(p) < 100 &&
            (filters.deadline === "overdue"
              ? p.dueDate < today()
              : filters.deadline === "today"
                ? p.dueDate === today()
                : p.dueDate >= today() &&
                  (new Date(p.dueDate + "T12:00").getTime() -
                    new Date(today() + "T12:00").getTime()) /
                    86400000 <=
                    Number(filters.deadline)))),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? priorities.indexOf(b.priority) - priorities.indexOf(a.priority)
        : sort === "Due date"
          ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999")
          : sort === "Recently updated"
            ? b.updatedAt.localeCompare(a.updatedAt)
            : sort === "Date created"
              ? b.createdAt.localeCompare(a.createdAt)
              : sort === "Completion"
                ? progress(b) - progress(a)
                : sort === "Alphabetical"
                  ? a.name.localeCompare(b.name)
                  : a.position - b.position,
    );
  const selectedProject = data.projects.find((p) => p.id === selected);
  const searchResults = data.projects.filter((p) =>
    `${p.name} ${p.description} ${p.tags.map((t) => t.name).join(" ")} ${p.tasks.map((t) => `${t.title} ${t.description} ${t.notes} ${t.tags.map((x) => x.name).join(" ")}`).join(" ")} ${p.notes.map((n) => `${n.title} ${n.content}`).join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const newProject = (columnId?: string) =>
    setForm({ kind: "project", columnId });
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Dashboard");
          }}
        >
          <span className="brand-symbol">
            <Orbit size={28} />
          </span>
          <span className="brand-name">
            orbit<span className="brand-dot">.</span>
          </span>
        </a>
        <button
          className="workspace-switch"
          onClick={() => navigate("Settings")}
        >
          <span className="avatar">A</span>
          <span className="workspace-label">
            <b>Personal workspace</b>
            <small>Just you. Endless possibilities.</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <button
          aria-label="Quick search"
          className="sidebar-search"
          onClick={() => setSearch(true)}
        >
          <Search size={16} />
          <span>Quick search</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              onClick={() => navigate(name)}
              className={page === name && !selected ? "active" : ""}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Projects" && (
                <b className="nav-count">{active.length}</b>
              )}
              {name === "Tasks" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-divider" />
        <nav>
          {[
            { name: "Completed Projects", icon: CircleCheck },
            { name: "Archive", icon: Archive },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-label={name}
              className={page === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="focus-card">
            <span className="focus-icon">
              <Sparkles size={20} />
            </span>
            <h4>A little focus goes a long way.</h4>
            <p>
              Big ideas. Small steps.
              <br />
              You&apos;ve got this.
            </p>
            <div className="focus-art">
              <i />
              <i />
              <i />
            </div>
          </div>
          <button
            aria-label="Settings"
            className={`settings-nav ${page === "Settings" ? "active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </button>
          <div className="profile">
            <span className="avatar profile-avatar">A</span>
            <div>
              <b>My workspace</b>
              <small>Personal account</small>
            </div>
            <button
              className="icon-button"
              aria-label="Toggle sidebar"
              onClick={() => {
                setCollapsed(!collapsed);
                localStorage.setItem(
                  "orbit-sidebar",
                  !collapsed ? "collapsed" : "expanded",
                );
              }}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <b>{selectedProject ? "Project workspace" : page}</b>
          </div>
          <div className="top-actions">
            <span className="local-status">
              <i /> All changes saved locally
            </span>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() => changeTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setNotifications(true)}
            >
              <Bell size={18} />
              {overdue > 0 && <i />}
            </button>
            <span className="top-divider" />
            <button
              className="quick-add"
              aria-label="Quick add"
              onClick={() => setQuick(true)}
            >
              <Plus size={17} />
            </button>
          </div>
        </header>
        <main>
          {selectedProject ? (
            <ProjectDetail
              project={selectedProject}
              data={data}
              mutate={mutate}
              onBack={() => setSelected(null)}
              onEdit={() =>
                setForm({ kind: "project", project: selectedProject })
              }
              onTask={(task) =>
                setForm({ kind: "task", task, projectId: selectedProject.id })
              }
              onOpen={open}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  {page === "Dashboard" && (
                    <div className="eyebrow">YOUR PERSONAL COMMAND CENTER</div>
                  )}
                  <h1>
                    {page === "Dashboard"
                      ? "A little clarity. A lot of progress."
                      : page === "Projects"
                        ? "All your ideas, in motion."
                        : page === "Tasks"
                          ? "One step at a time."
                          : page === "Calendar"
                            ? "Make space for what’s next."
                            : page === "Analytics"
                              ? "Look how far you’ve come."
                              : page === "Completed Projects"
                                ? "Good work, well done."
                                : page === "Archive"
                                  ? "Safely tucked away."
                                  : "Your workspace, your way."}
                  </h1>
                  <p>
                    {page === "Dashboard"
                      ? `Welcome back, Adnan. Let’s make room for your best work.`
                      : page === "Projects"
                        ? "From the first spark to the final detail."
                        : page === "Tasks"
                          ? "Everything to do, all in one place."
                          : page === "Calendar"
                            ? "Deadlines, tasks, and milestones in one clear view."
                            : page === "Analytics"
                              ? "A thoughtful look at your momentum."
                              : page === "Archive"
                                ? "Past projects, ready whenever you need them."
                                : page === "Completed Projects"
                                  ? "Take a moment to appreciate your progress."
                                  : "A few little things to make Orbit feel like home."}
                  </p>
                </div>
                <div className="heading-actions">
                  {page === "Dashboard" && (
                    <span className="current-date">
                      <CalendarDays size={15} />
                      {date}
                    </span>
                  )}
                  {[
                    "Dashboard",
                    "Projects",
                    "Completed Projects",
                    "Archive",
                  ].includes(page) && (
                    <button className="primary" onClick={() => newProject()}>
                      <Plus size={17} /> New project
                    </button>
                  )}
                </div>
              </div>
              {page === "Dashboard" && (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div>
                        <span>Active projects</span>
                        <span className="stat-icon lavender">
                          <FolderKanban size={18} />
                        </span>
                      </div>
                      <strong>
                        {
                          active.filter((p) => p.column.name !== "Completed")
                            .length
                        }
                        <span className="stat-note">
                          across {new Set(active.map((p) => p.categoryId)).size}{" "}
                          categories
                        </span>
                      </strong>
                      <small>
                        <span className="green-dot" /> Ideas moving forward
                      </small>
                    </div>
                    <div className="stat-card">
                      <div>
                        <span>Tasks remaining</span>
                        <span className="stat-icon blue">
                          <CheckSquare size={18} />
                        </span>
                      </div>
                      <strong>
                        {tasks.length - done}
                        <span className="stat-note">{done} completed</span>
                      </strong>
                      <small>
                        {overdue > 0 ? (
                          <>
                            <span className="orange-dot" />
                            {overdue} overdue · a little attention needed
                          </>
                        ) : (
                          <>You&apos;re right on track</>
                        )}
                      </small>
                    </div>
                    <div className="stat-card">
                      <div>
                        <span>Upcoming deadlines</span>
                        <span className="stat-icon peach">
                          <Clock3 size={18} />
                        </span>
                      </div>
                      <strong>
                        {upcoming}
                        <span className="stat-note">in the next 7 days</span>
                      </strong>
                      <small>
                        <span className="orange-dot" />
                        {blocked} {blocked === 1 ? "project" : "projects"}{" "}
                        currently blocked
                      </small>
                    </div>
                    <div className="stat-card">
                      <div>
                        <span>Overall completion</span>
                        <span className="stat-icon mint">
                          <ChartNoAxesCombined size={18} />
                        </span>
                      </div>
                      <strong>
                        {completion}
                        <em>%</em>
                        <span className="stat-note">Keep the momentum</span>
                      </strong>
                      <div className="mini-progress">
                        <span style={{ width: `${completion}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="focus-banner">
                    <span className="sparkle-box">
                      <Sparkles size={19} />
                    </span>
                    <p>
                      <b>Small steps, meaningful progress.</b> You have{" "}
                      {
                        active.filter((p) => p.column.name === "In Progress")
                          .length
                      }{" "}
                      projects in motion. What will you move forward today?
                    </p>
                    <button onClick={() => navigate("Tasks")}>
                      Find your focus <ArrowUpRight size={15} />
                    </button>
                  </div>
                </>
              )}
              {[
                "Dashboard",
                "Projects",
                "Completed Projects",
                "Archive",
              ].includes(page) && (
                <>
                  <div className="section-toolbar board-toolbar">
                    <div className="row">
                      <h2>
                        {page === "Dashboard"
                          ? "Project board"
                          : page === "Archive"
                            ? "Archived projects"
                            : page === "Completed Projects"
                              ? "Completed projects"
                              : "Project board"}
                      </h2>
                      <span className="count">{filtered.length}</span>
                      <span className="board-subtitle">
                        A place for every stage.
                      </span>
                    </div>
                    <div className="row">
                      <button
                        className={showFilters ? "selected" : ""}
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <SlidersHorizontal size={14} /> Filters
                        {Object.values(filters).some(Boolean) && (
                          <i className="filter-dot" />
                        )}
                      </button>
                      <div className="sort-select">
                        <ArrowDownWideNarrow size={14} />
                        <select
                          aria-label="Sort projects"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          {[
                            "Manual order",
                            "Priority",
                            "Due date",
                            "Recently updated",
                            "Date created",
                            "Completion",
                            "Alphabetical",
                          ].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="segmented">
                        <button
                          className={!list ? "active" : ""}
                          aria-label="Board view"
                          onClick={() => setList(false)}
                        >
                          <LayoutGrid size={16} />
                        </button>
                        <button
                          className={list ? "active" : ""}
                          aria-label="List view"
                          onClick={() => setList(true)}
                        >
                          <List size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {showFilters && (
                    <div className="filters wrap">
                      <select
                        aria-label="Filter category"
                        value={filters.category}
                        onChange={(e) =>
                          setFilters({ ...filters, category: e.target.value })
                        }
                      >
                        <option value="">All categories</option>
                        {data.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter priority"
                        value={filters.priority}
                        onChange={(e) =>
                          setFilters({ ...filters, priority: e.target.value })
                        }
                      >
                        <option value="">All priorities</option>
                        {priorities.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter status"
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                      >
                        <option value="">All statuses</option>
                        {data.columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Filter tag"
                        placeholder="Filter by tag…"
                        value={filters.tag}
                        onChange={(e) =>
                          setFilters({ ...filters, tag: e.target.value })
                        }
                      />
                      <select
                        aria-label="Filter deadline"
                        value={filters.deadline}
                        onChange={(e) =>
                          setFilters({ ...filters, deadline: e.target.value })
                        }
                      >
                        <option value="">Any deadline</option>
                        <option value="today">Due today</option>
                        <option value="3">Next 3 days</option>
                        <option value="7">Next 7 days</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      <select
                        aria-label="Filter completion"
                        value={filters.completion}
                        onChange={(e) =>
                          setFilters({ ...filters, completion: e.target.value })
                        }
                      >
                        <option value="">Any progress</option>
                        <option value="0">Not started</option>
                        <option value="partial">In progress</option>
                        <option value="100">100% complete</option>
                      </select>
                      <button onClick={() => setFilters(emptyFilters)}>
                        Clear filters
                      </button>
                    </div>
                  )}
                  {list ||
                  page === "Archive" ||
                  page === "Completed Projects" ? (
                    <div className="panel project-table">
                      {filtered.map((p) => (
                        <button
                          className="project-table-row"
                          key={p.id}
                          onClick={() => open(p.id)}
                        >
                          <span>
                            <b>{p.name}</b>
                            <small>{p.category.name}</small>
                          </span>
                          <span>{p.column.name}</span>
                          <PriorityBadge value={p.priority} />
                          <span>{progress(p)}%</span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                      {!filtered.length && (
                        <Empty>
                          No projects here yet. Your next idea has a home.
                        </Empty>
                      )}
                    </div>
                  ) : (
                    <Board
                      columns={data.columns}
                      projects={filtered}
                      onOpen={open}
                      onAdd={newProject}
                      mutate={mutate}
                    />
                  )}
                </>
              )}
              {page === "Dashboard" && (
                <div className="dashboard-bottom">
                  <ActivityFeed data={data} onOpen={open} />
                  <Upcoming projects={active} onOpen={open} />
                </div>
              )}
              {page === "Tasks" && (
                <Tasks
                  data={data}
                  mutate={mutate}
                  onEdit={(task) => setForm({ kind: "task", task })}
                  onAdd={() => setForm({ kind: "task" })}
                  onOpen={open}
                />
              )}{" "}
              {page === "Calendar" && (
                <CalendarView data={data} onOpen={open} />
              )}{" "}
              {page === "Analytics" && <Analytics data={data} />}{" "}
              {page === "Settings" && (
                <Settings
                  data={data}
                  mutate={mutate}
                  theme={theme}
                  onTheme={changeTheme}
                />
              )}
            </>
          )}
          <footer>
            <span>
              <Orbit size={13} /> A little more organized. A little more you.
            </span>
            <span>Built for your next big thing.</span>
          </footer>
        </main>
      </div>
      {form?.kind === "project" && (
        <ProjectForm
          data={data}
          project={form.project}
          columnId={form.columnId}
          onClose={() => setForm(null)}
          mutate={mutate}
        />
      )}{" "}
      {form?.kind === "task" && (
        <TaskForm
          data={data}
          task={form.task}
          projectId={form.projectId}
          onClose={() => setForm(null)}
          mutate={mutate}
        />
      )}{" "}
      {(form?.kind === "note" || form?.kind === "milestone") &&
        form.projectId && (
          <ItemForm
            kind={form.kind}
            projectId={form.projectId}
            onClose={() => setForm(null)}
            mutate={mutate}
          />
        )}{" "}
      {search && (
        <Modal title="Find your next step" onClose={() => setSearch(false)}>
          <div className="search-input">
            <Search size={20} />
            <input
              autoFocus
              placeholder="Search projects, tasks, notes, tags…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>Esc</kbd>
          </div>
          <p className="eyebrow">
            {query ? "SEARCH RESULTS" : "YOUR PROJECTS"} ·{" "}
            {searchResults.length}
          </p>
          <div className="search-results">
            {searchResults.map((p) => (
              <button key={p.id} onClick={() => open(p.id)}>
                <FolderKanban size={18} />
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.category.name} ·{" "}
                    {p.archived ? "Archived" : p.column.name}
                    {query &&
                    p.tasks.some((t) =>
                      t.title.toLowerCase().includes(query.toLowerCase()),
                    )
                      ? " · Matching task"
                      : ""}
                  </small>
                </div>
                <ArrowUpRight size={15} />
              </button>
            ))}
            {!searchResults.length && (
              <Empty>No matches. Try another word.</Empty>
            )}
          </div>
        </Modal>
      )}
      {quick && (
        <Modal title="A little something new" onClose={() => setQuick(false)}>
          <div className="quick-options">
            {[
              { kind: "project", label: "Project", icon: FolderKanban },
              { kind: "task", label: "Task", icon: CheckSquare },
              { kind: "note", label: "Note", icon: StickyNote },
              { kind: "milestone", label: "Milestone", icon: Flag },
            ].map(({ kind, label, icon: Icon }) => (
              <button
                key={kind}
                disabled={kind !== "project" && !data.projects.length}
                onClick={() => {
                  setQuick(false);
                  setForm({
                    kind: kind as "project",
                    projectId: selectedProject?.id || data.projects[0]?.id,
                  });
                }}
              >
                <Icon size={22} />
                <b>{label}</b>
                <Plus size={16} />
              </button>
            ))}
          </div>
          <p className="muted">
            Notes and milestones are added to{" "}
            {selectedProject?.name ||
              data.projects[0]?.name ||
              "your first project"}
            . Open a project to add them there.
          </p>
        </Modal>
      )}
      {notifications && (
        <Modal
          title="Needs a little attention"
          onClose={() => setNotifications(false)}
        >
          {active
            .filter(
              (p) =>
                p.column.name === "Blocked" ||
                p.tasks.some(
                  (t) =>
                    t.status !== "Done" && t.dueDate && t.dueDate < today(),
                ),
            )
            .map((p) => (
              <button
                key={p.id}
                className="deadline-row"
                onClick={() => open(p.id)}
              >
                <CircleAlert size={20} className="overdue" />
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.column.name === "Blocked"
                      ? "Project is blocked"
                      : `${p.tasks.filter((t) => t.status !== "Done" && t.dueDate && t.dueDate < today()).length} overdue tasks`}
                  </small>
                </div>
                <ArrowUpRight size={16} />
              </button>
            ))}
          {!overdue && !blocked && <Empty>You&apos;re all caught up.</Empty>}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
