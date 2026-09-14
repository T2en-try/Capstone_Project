import { expect, test } from "@playwright/test";
import {
  loginAsAdmin,
  mockAnalyticsApi,
  mockAuth,
  mockReportsApi,
} from "./fixtures";

test("protects admin routes from unauthenticated users", async ({ page }) => {
  await page.goto("/admin/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("input").first()).toBeVisible();
});

test.describe("authenticated admin critical workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockAuth(page);
    await mockReportsApi(page);
    await mockAnalyticsApi(page);
  });

  test("loads report detail and saves a priority status change", async ({ page }) => {
    let statusPatchSeen = false;

    await page.route(/\/api\/reports\/101\/priority-status$/, async (route) => {
      statusPatchSeen = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 101,
          latest_action: {
            new_status: "completed",
            note: "Repair completed",
            action_timestamp: "2026-08-03T12:00:00Z",
          },
          actions: [
            {
              new_status: "completed",
              note: "Repair completed",
              action_timestamp: "2026-08-03T12:00:00Z",
            },
          ],
        }),
      });
    });

    await page.goto("/admin/reports/101");

    await expect(page.getByText("RPT-101", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Sukhumvit Road").first()).toBeVisible();
    await expect(page.getByText("AI Confidence")).toBeVisible();

    await page.locator(".ant-select").last().click();
    await page.getByTitle(/Completed/).click();
    await page.locator("textarea").fill("Repair completed");
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect.poll(() => statusPatchSeen).toBe(true);
    await expect(page.getByText("Repair completed").first()).toBeVisible();
  });

  test("shows GIS priority map and filters AI verification records", async ({ page }) => {
    await page.goto("/admin/map");

    await expect(page.getByRole("heading", { name: "GIS Road Monitoring" })).toBeVisible();
    await expect(page.getByText("Grid Priority Legend")).toBeVisible();
    await expect(page.getByText("Road Segment Priority")).toBeVisible();
    await expect(page.locator(".leaflet-container")).toBeVisible();

    await page.goto("/admin/ai");

    await expect(page.getByRole("heading", { name: "AI Verification" })).toBeVisible();
    await expect(page.getByText("Sukhumvit Road").first()).toBeVisible();
    await expect(page.getByText("Rama IV Road").first()).toBeVisible();

    await page.locator("input").first().fill("Sukhumvit");

    await expect(page.getByText("Sukhumvit Road").first()).toBeVisible();
    await expect(page.getByText("Rama IV Road").first()).not.toBeVisible();
  });
});
