import { test, expect } from "@playwright/test";
test("project lifecycle, tasks, notes, milestones, filters, search, drag, theme and responsive layout", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A little clarity. A lot of progress." }),
  ).toBeVisible();
  const name = `Browser test ${Date.now()}`;
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill(name);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A project created by the end-to-end test.");
  await page
    .getByLabel("Starter tasks")
    .fill("First test task\nSecond test task");
  await page
    .getByLabel("Initial notes")
    .fill("# Browser test\n\nPersisted notes.");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const snapshot = await (await request.get("/api/workspace")).json();
  const project = snapshot.projects.find(
    (p: { name: string }) => p.name === name,
  );
  expect(project).toBeTruthy();
  expect(project.tasks.length).toBe(2);
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Updated project description");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Updated project description", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Task title").fill("New browser task");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New browser task", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete New browser task", exact: true })
    .click();
  await expect(
    page.getByLabel("Status for New browser task", { exact: true }),
  ).toHaveValue("Done");
  await page
    .getByRole("button", { name: "Subtasks for New browser task", exact: true })
    .click();
  await page.getByPlaceholder("Add a subtask…").fill("Check persistence");
  await page.getByPlaceholder("Add a subtask…").press("Enter");
  await expect(
    page.getByLabel("Check persistence", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Notes/ }).click();
  await expect(
    page.getByRole("heading", { name: "Project notes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add note", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Test note");
  await page
    .getByLabel("Content · Markdown supported")
    .fill("## Hello\n\n- [ ] Checklist");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(
    page.getByRole("heading", { name: "Hello", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Milestones/ }).click();
  await page.getByRole("button", { name: "Add milestone" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Test launch");
  await page.getByRole("button", { name: "Save milestone" }).click();
  await expect(
    page.getByRole("heading", { name: "Test launch" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All projects", exact: true }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page
    .getByLabel("Filter priority", { exact: true })
    .selectOption("Critical");
  await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Quick search" }).click();
  await page
    .getByPlaceholder("Search projects, tasks, notes, tags…")
    .fill("Check persistence");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByPlaceholder("Search projects, tasks, notes, tags…")
    .fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button")
    .filter({ hasText: name })
    .click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "All projects", exact: true }).click();
  const handle = page.getByRole("button", {
    name: `Move ${name}`,
    exact: true,
  });
  await handle.scrollIntoViewIfNeeded();
  await handle.focus();
  await page.keyboard.press("Space", { delay: 150 });
  await page.keyboard.press("ArrowRight", { delay: 150 });
  await page.keyboard.press("Space", { delay: 150 });
  await expect(page.locator(".toast")).toContainText("Moved successfully");
  const moved = await (await request.get("/api/workspace")).json();
  expect(
    moved.projects.find((p: { id: string }) => p.id === project.id).columnId,
  ).not.toBe(project.columnId);
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  for (const view of ["Tasks", "Calendar", "Analytics", "Settings"]) {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: view, exact: true })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Dashboard", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name, exact: true }).click();
  await page
    .getByRole("button", { name: "Archive project", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore project", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore project", exact: true })
    .click();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little clarity. A lot of progress." }),
  ).toBeVisible();
  const end = await (await request.get("/api/workspace")).json();
  expect(
    end.projects.find((p: { id: string }) => p.id === project.id),
  ).toBeFalsy();
  expect(errors).toEqual([]);
});
test("API rejects empty project and deleting an occupied column", async ({
  request,
}) => {
  const data = await (await request.get("/api/workspace")).json();
  const invalid = await request.post("/api/workspace", {
    data: { entity: "project", action: "create", data: { name: "" } },
  });
  expect(invalid.status()).toBe(400);
  const occupied = await request.post("/api/workspace", {
    data: { entity: "column", action: "delete", id: data.projects[0].columnId },
  });
  expect(occupied.status()).toBe(400);
});
