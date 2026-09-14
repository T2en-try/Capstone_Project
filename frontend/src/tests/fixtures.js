export const mockReports = [
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
    latest_action: {
      new_status: "processing",
      note: "Assigned to field team",
      action_timestamp: "2026-08-02T10:30:00Z",
    },
    actions: [
      {
        new_status: "processing",
        note: "Assigned to field team",
        action_timestamp: "2026-08-02T10:30:00Z",
      },
    ],
    ai_analysis: {
      model_version: "test-model",
      cv_defect_count: 3,
      cv_damage_ratio_percent: 18.5,
      cv_max_severity_score: 5,
      final_fusion_score: 0.82,
      priority_class: 3,
      confidence_score: 0.91,
      proba_normal: 0.05,
      proba_warning: 0.19,
      proba_critical: 0.76,
      final_decision: "critical",
      road_name: "Sukhumvit Road",
      road_type: "Primary",
      admin_province: "Bangkok",
      admin_district: "Khlong Toei",
      admin_subdistrict: "Phra Khanong",
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
    latest_action: {
      new_status: "pending",
      note: "Waiting for crew",
      action_timestamp: "2026-08-02T09:10:00Z",
    },
    actions: [
      {
        new_status: "pending",
        note: "Waiting for crew",
        action_timestamp: "2026-08-02T09:10:00Z",
      },
    ],
    ai_analysis: {
      model_version: "test-model",
      cv_defect_count: 1,
      cv_damage_ratio_percent: 7,
      cv_max_severity_score: 2,
      final_fusion_score: 0.3,
      priority_class: 2,
      confidence_score: 0.74,
      proba_normal: 0.2,
      proba_warning: 0.68,
      proba_critical: 0.12,
      final_decision: "moderate",
      road_name: "Rama IV Road",
      road_type: "Secondary",
      admin_province: "Bangkok",
      admin_district: "Pathum Wan",
      admin_subdistrict: "Lumphini",
      lanes: 2,
      speed_limit: 50,
      rainfall_last_12m_mm: 80,
      soil_moisture_last_30d_mm: 0.2,
      ndvi_index: 0.12,
      slope: 0.5,
    },
  },
];

export const mockPoints = mockReports.map((report) => ({
  id: report.id,
  latitude: report.latitude,
  longitude: report.longitude,
  status: report.status,
  priority_status: report.latest_action.new_status,
  reporter_name: report.reporter_name,
  created_at: report.created_at,
  severity_score: report.ai_analysis.cv_max_severity_score,
  fusion_score: report.ai_analysis.final_fusion_score,
  confidence_score: report.ai_analysis.confidence_score,
  priority_class: report.ai_analysis.priority_class,
  decision: report.ai_analysis.final_decision,
  road_name: report.ai_analysis.road_name,
  damage_level: report.ai_analysis.final_decision,
}));

export const mockEmployees = [
  {
    id: 1,
    employee_code: "EMP001",
    first_name: "Anan",
    last_name: "Roadteam",
    email: "anan@example.com",
    phone: "0812345678",
    department: "Maintenance",
    position: "Officer",
    role: "officer",
    is_active: 1,
    last_login: "2026-08-05T08:00:00Z",
  },
  {
    id: 2,
    employee_code: "ADM001",
    first_name: "Admin",
    last_name: "User",
    email: "admin@example.com",
    phone: "0899999999",
    department: "Operations",
    position: "Supervisor",
    role: "admin",
    is_active: 1,
    last_login: null,
  },
];

const json = (data, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(data),
});

export async function mockUploads(page) {
  await page.route("**/uploads/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" />',
    });
  });
}

export async function mockAuth(page) {
  await page.route(/\/api\/auth\/me$/, async (route) => {
    await route.fulfill(json({
      status: "success",
      admin: {
        id: 1,
        email: "admin@example.com",
        full_name: "Test Admin",
        role: "admin",
      },
    }));
  });
}

export async function loginAsAdmin(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("admin_token", "test-token");
    window.localStorage.setItem("admin_info", JSON.stringify({
      id: 1,
      email: "admin@example.com",
      full_name: "Test Admin",
      role: "admin",
    }));
  });
}

export async function mockReportsApi(page) {
  await mockUploads(page);

  await page.route(/\/api\/reports\/stats\/summary$/, async (route) => {
    await route.fulfill(json({
      total_reports: mockReports.length,
      pending_count: 1,
      processing_count: 0,
      completed_count: 1,
      rejected_count: 0,
    }));
  });

  await page.route(/\/api\/reports\/map\/points\?/, async (route) => {
    await route.fulfill(json({ total: mockPoints.length, points: mockPoints }));
  });

  await page.route(/\/api\/reports\/\?/, async (route) => {
    await route.fulfill(json({
      total: mockReports.length,
      page: 1,
      per_page: 100,
      reports: mockReports,
    }));
  });

  await page.route(/\/api\/reports\/101\/priority-status$/, async (route) => {
    const updated = {
      ...mockReports[0],
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
        ...mockReports[0].actions,
      ],
    };

    await route.fulfill(json(updated));
  });

  await page.route(/\/api\/reports\/101$/, async (route) => {
    await route.fulfill(json(mockReports[0]));
  });

  await page.route(/\/api\/reports\/102$/, async (route) => {
    await route.fulfill(json(mockReports[1]));
  });
}

export async function mockAnalyticsApi(page) {
  await page.route(/\/api\/analytics\/grid-priority\?/, async (route) => {
    await route.fulfill(json({
      grids: [
        {
          grid_id: "grid-a",
          lat_min: 13.754,
          lat_max: 13.758,
          lon_min: 100.5,
          lon_max: 100.504,
          lat_center: 13.756,
          lon_center: 100.502,
          report_count: 2,
          avg_ppi: 82,
          cus: 68,
          count_score: 70,
          density_score: 75,
          recency_score: 80,
          overall_priority: 79,
          priority_level: "critical",
          priority_color: "#DC2626",
        },
      ],
      summary: {
        total_grids: 1,
        critical_count: 1,
        warning_count: 0,
        moderate_count: 0,
        good_count: 0,
      },
    }));
  });

  await page.route(/\/api\/analytics\/road-segment-priority\?/, async (route) => {
    await route.fulfill(json({
      segments: [
        {
          osm_way_id: "12345",
          road_name: "Sukhumvit Road",
          priority_class: 3,
          max_priority_score: 82,
          report_count: 2,
          coordinates: [
            [13.7563, 100.5018],
            [13.757, 100.503],
          ],
        },
      ],
    }));
  });
}

export async function mockEmployeesApi(page) {
  let employees = [...mockEmployees];

  await page.route(/\/api\/employees$/, async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill(json(employees));
      return;
    }

    if (method === "POST") {
      const payload = await route.request().postDataJSON();
      const created = {
        id: 3,
        is_active: 1,
        last_login: null,
        ...payload,
      };
      employees = [...employees, created];
      await route.fulfill(json(created, 201));
      return;
    }

    await route.fallback();
  });
}
