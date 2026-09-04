import { expect, test } from "@playwright/test";

const mockReports = [
  {
    id: 101,
    image_filename: "road-101.jpg",
    image_original_name: "road-101.jpg",
    image_size_bytes: 1024,
    image_mime_type: "image/jpeg",
    latitude: 13.7563,
    longitude: 100.5018,
    gps_source: "manual",
    description: "Large pothole near the school entrance",
    reporter_name: "Somchai",
    status: "completed",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-01T10:30:00Z",
    ai_analysis: {
      model_version: "test-model",
      cv_defect_count: 3,
      cv_damage_ratio_percent: 18.5,
      cv_max_severity_score: 5,
      final_fusion_score: 0.82,
      final_decision: "critical",
      road_name: "Sukhumvit Road",
      road_type: "Primary",
      lanes: 4,
      speed_limit: 60,
      rainfall_last_12m_mm: 120,
      soil_moisture_last_30d_mm: 0.4,
      ndvi_index: 0.25,
      slope: 1.2,
    },
  },
  {
    id: 102,
    image_filename: "road-102.jpg",
    image_original_name: "road-102.jpg",
    image_size_bytes: 2048,
    image_mime_type: "image/jpeg",
    latitude: 13.745,
    longitude: 100.53,
    gps_source: "exif",
    description: "Cracked road surface beside market",
    reporter_name: "Mali",
    status: "pending",
    created_at: "2026-08-02T09:00:00Z",
    updated_at: "2026-08-02T09:10:00Z",
    ai_analysis: {
      model_version: "test-model",
      cv_defect_count: 1,
      cv_damage_ratio_percent: 7,
      cv_max_severity_score: 2,
      final_fusion_score: 0.3,
      final_decision: "moderate",
      road_name: "Rama IV Road",
      road_type: "Secondary",
      lanes: 2,
      speed_limit: 50,
      rainfall_last_12m_mm: 80,
      soil_moisture_last_30d_mm: 0.2,
      ndvi_index: 0.12,
      slope: 0.5,
    },
  },
];

const mockPoints = mockReports.map((report) => ({
  id: report.id,
  latitude: report.latitude,
  longitude: report.longitude,
  status: report.status,
  reporter_name: report.reporter_name,
  created_at: report.created_at,
  severity_score: report.ai_analysis.cv_max_severity_score,
  fusion_score: report.ai_analysis.final_fusion_score,
  decision: report.ai_analysis.final_decision,
  road_name: report.ai_analysis.road_name,
  damage_level: report.ai_analysis.final_decision,
}));

async function mockDashboardApi(page) {
  await page.route("**/uploads/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" />',
    });
  });

  await page.route(/\/api\/reports\/stats\/summary$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total_reports: 2,
        pending_count: 1,
        processing_count: 0,
        completed_count: 1,
        rejected_count: 0,
      }),
    });
  });

  await page.route(/\/api\/reports\/map\/points\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: mockPoints.length, points: mockPoints }),
    });
  });

  await page.route(/\/api\/reports\/\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: mockReports.length,
        page: 1,
        per_page: 100,
        reports: mockReports,
      }),
    });
  });

  await page.route(/\/api\/reports\/101$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockReports[0]),
    });
  });
}

test.describe("user dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboardApi(page);
  });

  test("loads dashboard data and renders map points", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Somchai")).toBeVisible();
    await expect(page.getByText("Mali")).toBeVisible();
    await expect(page.getByText("2").first()).toBeVisible();

    await page.getByRole("button", { name: "Marker" }).click();
    await expect(page.locator(".leaflet-marker-icon")).toHaveCount(2);
  });

  test("filters reports by keyword and status", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="text"]').fill("Sukhumvit");
    await page.keyboard.press("Enter");

    await expect(page.getByText("Sukhumvit Road")).toBeVisible();
    await expect(page.getByText("Rama IV Road")).not.toBeVisible();

    await page.locator("select").selectOption("pending");
    await expect(page.getByText("Sukhumvit Road")).not.toBeVisible();
  });

  test("opens and closes report detail modal from search results", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="text"]').fill("Sukhumvit");
    await page.keyboard.press("Enter");
    await page.getByRole("button").filter({ hasText: "Sukhumvit Road" }).click();

    const modal = page.locator(".fixed.inset-0");
    await expect(modal.getByText("Large pothole near the school entrance")).toBeVisible();
    await expect(modal.getByText("Fusion Score")).toBeVisible();
    await expect(modal.getByText("0.82")).toBeVisible();

    await modal.locator("button").first().click();
    await expect(modal.getByText("Fusion Score")).not.toBeVisible();
  });
});

test("admin login redirects to dashboard", async ({ page }) => {
  await page.route(/\/api\/auth\/login$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        access_token: "test-token",
        token_type: "bearer",
        admin: {
          id: 1,
          email: "admin@example.com",
          full_name: "Test Admin",
          role: "admin",
        },
      }),
    });
  });

  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        admin: {
          id: 1,
          email: "admin@example.com",
          full_name: "Test Admin",
          role: "admin",
        },
      }),
    });
  });

  await page.route(/\/api\/analytics\/grid-priority\?/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        grids: [],
        summary: {
          total_grids: 0,
          critical_count: 0,
          warning_count: 0,
          moderate_count: 0,
          good_count: 0,
        },
      }),
    });
  });

  await page.goto("/login");
  await page.locator("input").first().fill("admin@example.com");
  await page.locator("input[type='password']").fill("correct-password");
  await page.locator("button[type='submit']").click();

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("admin_token")))
    .toBe("test-token");
});
