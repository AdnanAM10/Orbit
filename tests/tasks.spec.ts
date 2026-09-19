import { test, expect } from "@playwright/test";
test("task editing, keyboard status movement, pointer project drag, deletion and custom columns", async ({
  page,
  request,
}) => {
  const snapshot = await (await request.get("/api/workspace")).json();
  const name = `Task workflow ${Date.now()}`;
  const created = await request.post("/api/workspace", {
    data: {
      entity: "project",
      action: "create",
      data: {
        name,
        columnId: snapshot.columns[0].id,
        categoryId: snapshot.categories[0].id,
        starterTasks: "Drag me",
      },
    },
  });
  const result = await created.json();
  const project = result.projects.find(
    (p: { name: string }) => p.name === name,
  );
  try {
    await page.goto("/");
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "Drag me", exact: true }).click();
    await page.getByLabel("Task title").fill("Edited task");
    await page.getByLabel("Estimated hours").fill("2");
    await page.getByRole("button", { name: "Save task" }).click();
    await expect(
      page.getByRole("button", { name: "Edited task", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Board view", exact: true }).click();
    const handle = page.getByRole("button", { name: "Move task Edited task" });
    await handle.focus();
    await page.keyboard.press("Space", { delay: 150 });
    await page.keyboard.press("ArrowRight", { delay: 150 });
    await page.keyboard.press("Space", { delay: 150 });
    await expect(page.locator(".toast")).toContainText("Moved successfully");
    const moved = await (await request.get("/api/workspace")).json();
    expect(
      moved.projects.find((p: { id: string }) => p.id === project.id).tasks[0]
        .status,
    ).toBe("In Progress");
    await page.getByRole("button", { name: "List view", exact: true }).click();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete Edited task" }).click();
    await expect(
      page.getByRole("button", { name: "Edited task", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "All projects", exact: true })
      .click();
    const grip = page.getByRole("button", {
      name: `Move ${name}`,
      exact: true,
    });
    const target = page.locator(".kanban-column").nth(1);
    await grip.scrollIntoViewIfNeeded();
    const sourceBox = await grip.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw Error("Missing drag targets");
    await page.mouse.move(sourceBox.x + 5, sourceBox.y + 5);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + 15, sourceBox.y + 5, { steps: 3 });
    await page.mouse.move(targetBox.x + 80, targetBox.y + 70, { steps: 20 });
    await page.mouse.up();
    await expect(page.locator(".toast")).toContainText("Moved successfully");
    await expect
      .poll(async () => {
        const afterDrag = await (await request.get("/api/workspace")).json();
        return afterDrag.projects.find(
          (p: { id: string }) => p.id === project.id,
        ).columnId;
      })
      .toBe(snapshot.columns[1].id);
    await page.getByRole("button", { name: "Add column", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill("Custom test column");
    await page.getByLabel("WIP limit (0 for unlimited)").fill("2");
    await page.getByRole("button", { name: "Save column" }).click();
    await page
      .getByRole("button", { name: "Edit Custom test column column" })
      .click();
    await page
      .getByRole("button", { name: "Delete column", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Edit Custom test column column" }),
    ).toHaveCount(0);
  } finally {
    await request.post("/api/workspace", {
      data: { entity: "project", action: "delete", id: project.id },
    });
  }
});

test("reordering completed tasks preserves completion history", async ({
  request,
}) => {
  const data = await (await request.get("/api/workspace")).json();
  const result = await (
    await request.post("/api/workspace", {
      data: {
        entity: "project",
        action: "create",
        data: {
          name: `Task workflow history ${Date.now()}`,
          columnId: data.columns[0].id,
          categoryId: data.categories[0].id,
          starterTasks: "History task",
        },
      },
    })
  ).json();
  const project = result.projects.find((p: { name: string }) =>
    p.name.startsWith("Task workflow history "),
  );
  try {
    const task = project.tasks[0];
    const saved = await (
      await request.post("/api/workspace", {
        data: {
          entity: "task",
          action: "update",
          id: task.id,
          data: { status: "Done" },
        },
      })
    ).json();
    const completedAt = saved.projects.find(
      (p: { id: string }) => p.id === project.id,
    ).tasks[0].completedAt;
    const reordered = await (
      await request.post("/api/workspace", {
        data: {
          entity: "reorder",
          action: "update",
          data: {
            kind: "task",
            projectId: project.id,
            items: [{ id: task.id, position: 0, status: "Done" }],
          },
        },
      })
    ).json();
    expect(
      reordered.projects.find((p: { id: string }) => p.id === project.id)
        .tasks[0].completedAt,
    ).toBe(completedAt);
  } finally {
    await request.post("/api/workspace", {
      data: { entity: "project", action: "delete", id: project.id },
    });
  }
});
