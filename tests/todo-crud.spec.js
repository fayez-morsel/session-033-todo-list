const { test, expect } = require("@playwright/test");

test.skip(!process.env.CI, "Playwright CRUD test runs only in CI");

test("user can create, view, and delete a task", async ({ page }) => {
  const unique = Date.now();
  const email = `playwright.${unique}@example.com`;
  const password = "Test123!";
  const fullName = `Playwright User ${unique}`;
  const familyName = `Playwright Family ${unique}`;
  const taskTitle = `Playwright Task ${unique}`;

  await page.goto("/");
  await page.getByRole("link", { name: "Get Started" }).click();
  await page.getByRole("button", { name: "Register" }).first().click();

  await page.getByPlaceholder("Enter your full name").fill(fullName);
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("********").fill(password);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/auth/register") &&
        response.request().method() === "POST" &&
        response.ok()
    ),
    page.getByRole("button", { name: "Create Account" }).click(),
  ]);

  await page.waitForURL("**/family", { waitUntil: "networkidle" });

  const familyNameInput = page.locator("input[placeholder='Create family']");
  await familyNameInput.fill(familyName);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/families") &&
        response.request().method() === "POST" &&
        response.ok()
    ),
    page.getByRole("button", { name: "Create family" }).click(),
  ]);

  await page.waitForURL("**/dashboard", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "View All Tasks" }).click();

  await page.waitForURL("**/tasks", { waitUntil: "networkidle" });
  await page.waitForResponse(
    (response) =>
      response.url().includes("/todos") &&
      response.request().method() === "GET" &&
      response.ok()
  );
  await expect(page.getByText("No tasks yet", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Create new task" }).click();
  await page.getByPlaceholder("Enter task title").fill(taskTitle);
  await page
    .getByPlaceholder("Add more details...")
    .fill("Created via Playwright E2E test");

  await page.waitForResponse(
    (response) =>
      response.url().includes("/users") &&
      response.request().method() === "GET" &&
      response.ok()
  );

  const assigneeSelect = page.locator("select").first();
  await assigneeSelect.waitFor();
  await assigneeSelect.locator("option", { hasText: fullName }).waitFor();
  await assigneeSelect.selectOption({ label: fullName });

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/todos") &&
        response.request().method() === "POST" &&
        response.ok()
    ),
    page.getByRole("button", { name: "Save Task" }).click(),
  ]);

  const taskHeading = page
    .getByRole("heading", { name: taskTitle, exact: true })
    .first();
  await expect(taskHeading).toBeVisible();

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/todos/") &&
        response.request().method() === "DELETE" &&
        response.ok()
    ),
    page
      .getByRole("button", { name: "Delete" })
      .first()
      .click(),
  ]);

  await expect(page.getByText("No tasks yet", { exact: false })).toBeVisible();
});
