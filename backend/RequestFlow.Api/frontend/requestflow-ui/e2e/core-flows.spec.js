import {
  expect,
  test
} from "@playwright/test";

async function openDemo(page) {
  await page.goto("/login");

  await page
    .getByRole("button", {
      name: "Explore Demo"
    })
    .click();

  await expect(page).toHaveURL(
    /\/overview$/
  );

  await expect(
    page.getByRole("heading", {
      level: 1
    })
  ).toContainText("Demo");
}

test("demo user can navigate core request pages", async ({
  page
}) => {
  await openDemo(page);

  await page
    .getByRole("link", {
      name: "All Requests",
      exact: true
    })
    .click();

  await expect(page).toHaveURL(
    /\/requests$/
  );
  await expect(
    page.getByRole("heading", {
      name: "All Requests"
    })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Kanban",
      exact: true
    })
    .click();

  await expect(
    page.getByText("Kanban Board", {
      exact: true
    })
  ).toBeVisible();

  await page
    .getByRole("link", {
      name: "Knowledge Base",
      exact: true
    })
    .click();

  await expect(page).toHaveURL(
    /\/knowledge-base$/
  );
  await expect(
    page.getByRole("heading", {
      name: "Knowledge Base",
      level: 1
    })
  ).toBeVisible();
  await expect(
    page.getByLabel(
      "Search the knowledge base"
    )
  ).toBeVisible();
});

test("create request shows useful validation and protects drafts", async ({
  page
}) => {
  await openDemo(page);

  await page
    .getByRole("link", {
      name: "Create Request",
      exact: true
    })
    .click();

  await expect(page).toHaveURL(
    /\/requests\/create$/
  );
  await expect(
    page.getByRole("heading", {
      name: "Create Request",
      level: 1
    })
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Submit Request"
    })
    .click();

  const validationSummary =
    page.getByRole("alert").filter({
      hasText:
        "Check the required information"
    });

  await expect(
    validationSummary
  ).toContainText(
    "Request title is required."
  );
  await expect(
    validationSummary
  ).toContainText(
    "Category is required."
  );
  await expect(
    validationSummary
  ).toContainText(
    "Request description is required."
  );

  await page
    .getByLabel("Request Title")
    .fill("Playwright draft check");

  await expect(
    page.locator(
      ".create-request-draft-card strong"
    )
  ).toContainText(
    /Draft (protection active|saved)/
  );
});
