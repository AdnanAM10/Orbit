import { NextResponse } from "next/server";
import { db, snapshot } from "@/lib/db";
import { priorities, statuses } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await snapshot());
}
const pick = (data: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]));
const tagData = (tags: unknown) => ({
  connectOrCreate: String(tags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ where: { name }, create: { name } })),
});
export async function POST(req: Request) {
  try {
    if (
      req.headers.get("origin") &&
      new URL(req.headers.get("origin")!).host !==
        (req.headers.get("host") || new URL(req.url).host)
    )
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const { entity, action, id, data = {} } = await req.json();
    if (!["create", "update", "delete"].includes(action))
      throw Error("Unknown action");
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw Error("Invalid data");
    if ("priority" in data && !priorities.includes(data.priority))
      throw Error("Invalid priority");
    if (entity === "task" && data.status && !statuses.includes(data.status))
      throw Error("Invalid task status");
    if (
      entity === "milestone" &&
      data.status &&
      !["Upcoming", "In Progress", "Completed"].includes(data.status)
    )
      throw Error("Invalid milestone status");
    for (const key of ["progress", "wip", "estimatedHours", "actualHours"]) {
      if (
        key in data &&
        (typeof data[key] !== "number" ||
          !Number.isFinite(data[key]) ||
          data[key] < 0 ||
          (key === "progress" && data[key] > 100))
      )
        throw Error(`Invalid ${key}`);
    }
    for (const key of ["dueDate", "startDate"]) {
      if (
        data[key] &&
        (typeof data[key] !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(data[key]) ||
          Number.isNaN(Date.parse(data[key])))
      )
        throw Error("Invalid date");
    }
    if (
      ![
        "project",
        "task",
        "note",
        "milestone",
        "column",
        "subtask",
        "category",
        "reorder",
      ].includes(entity)
    )
      throw Error("Unknown entity");
    let projectId: string | undefined;
    let label = "";
    let event = action;
    if (entity === "reorder") {
      if (!Array.isArray(data.items) || data.items.length > 1000)
        throw Error("Invalid order");
      if (
        data.kind === "task" &&
        data.items.some(
          (item: { status?: string }) =>
            item.status && !statuses.includes(item.status),
        )
      )
        throw Error("Invalid task status");
      const originals =
        data.kind === "task"
          ? await db.task.findMany({
              where: {
                id: { in: data.items.map((item: { id: string }) => item.id) },
              },
            })
          : [];
      await db.$transaction(
        data.items.map(
          (item: {
            id: string;
            position: number;
            columnId?: string;
            status?: string;
          }) =>
            data.kind === "task"
              ? db.task.update({
                  where: { id: item.id },
                  data: {
                    position: item.position,
                    ...(item.status &&
                    originals.find((t) => t.id === item.id)?.status !==
                      item.status
                      ? {
                          status: item.status,
                          completedAt:
                            item.status === "Done" ? new Date() : null,
                        }
                      : {}),
                  },
                })
              : db.project.update({
                  where: { id: item.id },
                  data: {
                    position: item.position,
                    ...(item.columnId ? { columnId: item.columnId } : {}),
                  },
                }),
        ),
      );
      if (data.projectId) {
        projectId = data.projectId;
        event = "Status / order changed";
      }
    } else if (entity === "project") {
      if (action === "delete") {
        const p = await db.project.delete({ where: { id } });
        label = p.name;
      } else {
        if (action === "create" && !String(data.name || "").trim())
          throw Error("Project name is required");
        if ("name" in data && !String(data.name).trim())
          throw Error("Project name is required");
        const fields = pick(data, [
          "name",
          "description",
          "columnId",
          "priority",
          "categoryId",
          "progress",
          "autoProgress",
          "startDate",
          "dueDate",
          "archived",
          "pinned",
          "position",
        ]);
        if (
          "progress" in fields &&
          (Number(fields.progress) < 0 || Number(fields.progress) > 100)
        )
          throw Error("Progress must be 0–100");
        if ("tags" in data)
          fields.tags =
            action === "create"
              ? tagData(data.tags)
              : { set: [], ...tagData(data.tags) };
        const previous =
          action === "update"
            ? await db.project.findUnique({ where: { id } })
            : null;
        if (action === "create") {
          fields.tasks = {
            create: String(data.starterTasks || "")
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean)
              .map((title, position) => ({ title, position })),
          };
          if (data.initialNotes)
            fields.notes = {
              create: {
                title: "Project notes",
                content: String(data.initialNotes),
              },
            };
        }
        const p =
          action === "create"
            ? await db.project.create({ data: fields as never })
            : await db.project.update({ where: { id }, data: fields as never });
        projectId = p.id;
        label = p.name;
        event =
          data.archived === true
            ? "archived"
            : data.archived === false
              ? "restored"
              : data.columnId && previous && previous.columnId !== data.columnId
                ? "status changed"
                : "dueDate" in data &&
                    previous &&
                    previous.dueDate !== data.dueDate
                  ? "deadline / details updated"
                  : action;
        if (
          previous &&
          previous.columnId !== p.columnId &&
          (await db.column.findUnique({ where: { id: p.columnId } }))?.name ===
            "Completed"
        )
          event = "completed";
      }
    } else if (entity === "task") {
      if (action === "delete") {
        const t = await db.task.delete({ where: { id } });
        projectId = t.projectId;
        label = t.title;
      } else {
        if (
          (action === "create" || "title" in data) &&
          !String(data.title || "").trim()
        )
          throw Error("Task title is required");
        const fields = pick(data, [
          "projectId",
          "title",
          "description",
          "status",
          "priority",
          "category",
          "notes",
          "dueDate",
          "estimatedHours",
          "actualHours",
          "position",
        ]);
        const previous =
          action === "update"
            ? await db.task.findUnique({ where: { id } })
            : null;
        if (data.status && data.status !== previous?.status)
          fields.completedAt = data.status === "Done" ? new Date() : null;
        if ("tags" in data)
          fields.tags =
            action === "create"
              ? tagData(data.tags)
              : { set: [], ...tagData(data.tags) };
        const t =
          action === "create"
            ? await db.task.create({ data: fields as never })
            : await db.task.update({ where: { id }, data: fields as never });
        projectId = t.projectId;
        label = t.title;
        event =
          data.status === "Done" && previous?.status !== "Done"
            ? "completed"
            : action;
      }
    } else if (entity === "column") {
      if (action === "delete") {
        if (await db.project.count({ where: { columnId: id } }))
          throw Error(
            "Move all projects out of this column before deleting it",
          );
        await db.column.delete({ where: { id } });
      } else {
        if (
          (action === "create" || "name" in data) &&
          !String(data.name || "").trim()
        )
          throw Error("Column name is required");
        const fields = pick(data, [
          "name",
          "color",
          "position",
          "collapsed",
          "wip",
        ]);
        if (action === "create")
          await db.column.create({ data: fields as never });
        else await db.column.update({ where: { id }, data: fields });
      }
    } else if (entity === "category") {
      if (!String(data.name || "").trim())
        throw Error("Category name required");
      await db.category.create({ data: { name: data.name.trim() } });
    } else {
      const keys =
        entity === "note"
          ? ["projectId", "title", "content"]
          : entity === "milestone"
            ? [
                "projectId",
                "name",
                "description",
                "dueDate",
                "status",
                "progress",
              ]
            : ["taskId", "title", "completed"];
      const fields = pick(data, keys);
      const required = entity === "milestone" ? "name" : "title";
      if (
        (action === "create" || required in fields) &&
        !String(fields[required] || "").trim()
      )
        throw Error("A name is required");
      const model = db[entity as "note"] as typeof db.note;
      const result =
        action === "delete"
          ? await model.delete({ where: { id } })
          : action === "create"
            ? await model.create({ data: fields as never })
            : await model.update({ where: { id }, data: fields as never });
      projectId = "projectId" in result ? result.projectId : undefined;
      if (entity === "subtask" && "taskId" in result)
        projectId = (
          await db.task.findUnique({ where: { id: String(result.taskId) } })
        )?.projectId;
      label = String(fields[required] || entity);
      event = data.status === "Completed" ? "completed" : action;
    }
    if (projectId && entity !== "project")
      await db.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      });
    if (entity !== "reorder" || projectId)
      await db.activity.create({
        data: {
          projectId,
          action: `${entity[0].toUpperCase() + entity.slice(1)} ${event === "create" ? "created" : event === "delete" ? "deleted" : event === "update" ? "updated" : event}`,
          metadata: label,
        },
      });
    return NextResponse.json(await snapshot());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to save changes",
      },
      { status: 400 },
    );
  }
}
