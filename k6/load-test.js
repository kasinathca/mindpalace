/**
 * Mind Palace — k6 Load Test Script
 *
 * NFR target: 100 concurrent users with < 500ms p95 response time
 *             and error rate < 1% (NFR-PERF-4).
 *
 * Run:
 *   k6 run k6/load-test.js
 *
 * Environment variables:
 *   BASE_URL     API base URL (default: http://localhost:3000)
 *   TEST_EMAIL   Pre-seeded user email (default: alice@example.com)
 *   TEST_PASS    Pre-seeded user password (default: Password123!)
 *
 * Example with overrides:
 *   k6 run -e BASE_URL=https://api.mindpalace.example.com \
 *           -e TEST_EMAIL=loadtest@example.com \
 *           -e TEST_PASS=SuperSecret42! \
 *           k6/load-test.js
 *
 * Requires the database to be seeded with at least one user and several
 * bookmarks. Run `pnpm --filter api run db:seed` first.
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = __ENV.TEST_EMAIL || "alice@example.com";
const TEST_PASS = __ENV.TEST_PASS || "Password123!";

/** All API calls share these headers */
const JSON_HEADERS = { "Content-Type": "application/json" };

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const loginTrend = new Trend("login_duration_ms", true);
const bookmarkListTrend = new Trend("bookmark_list_duration_ms", true);
const searchTrend = new Trend("search_duration_ms", true);
const createBookmarkTrend = new Trend("create_bookmark_duration_ms", true);
const errorRate = new Rate("error_rate");
const bookmarksCreated = new Counter("bookmarks_created");

// ---------------------------------------------------------------------------
// Test stages — 15-minute run mirroring real-world ramp patterns
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    // Ramp up to 50 users over 2 minutes
    { duration: "2m", target: 50 },
    // Ramp up to 100 users over 3 minutes
    { duration: "3m", target: 100 },
    // Sustain 100 users for 7 minutes (main load period)
    { duration: "7m", target: 100 },
    // Ramp down to 0 over 3 minutes
    { duration: "3m", target: 0 },
  ],

  thresholds: {
    // NFR-PERF-4: p95 of all HTTP responses must be < 500 ms
    http_req_duration: ["p(95)<500"],

    // Error rate must stay below 1%
    error_rate: ["rate<0.01"],

    // Per-endpoint granular thresholds
    login_duration_ms: ["p(95)<400"],
    bookmark_list_duration_ms: ["p(95)<450"],
    search_duration_ms: ["p(95)<500"],
    create_bookmark_duration_ms: ["p(95)<500"],

    // HTTP errors (non-2xx that aren't expected 4xx) < 1%
    http_req_failed: ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Setup — runs once before all VUs start
// ---------------------------------------------------------------------------

/**
 * Authenticates once as the test user and shares the access token
 * with all virtual users via k6's setup() → default() data flow.
 *
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS }),
    { headers: JSON_HEADERS },
  );

  const success = check(res, {
    "setup: login status 200": (r) => r.status === 200,
    "setup: access token present": (r) =>
      r.json("data.accessToken") !== undefined,
  });

  if (!success) {
    console.error(
      `Setup failed — could not authenticate. Status: ${res.status}`,
    );
    console.error(`Body: ${res.body}`);
  }

  return {
    accessToken: res.json("data.accessToken"),
    refreshToken: res.json("data.refreshToken"),
  };
}

// ---------------------------------------------------------------------------
// Virtual User scenario
// ---------------------------------------------------------------------------

/**
 * Each VU executes this function repeatedly for the duration of the test.
 * Simulates a realistic mix of read-heavy browsing and occasional writes.
 *
 * @param {{ accessToken: string }} data - Token shared by setup()
 */
export default function (data) {
  const authHeaders = {
    ...JSON_HEADERS,
    Authorization: `Bearer ${data.accessToken}`,
  };

  // Weight: ~60% browse, ~20% search, ~20% create — realistic usage mix
  const roll = Math.random();

  if (roll < 0.6) {
    scenarioBrowse(authHeaders);
  } else if (roll < 0.8) {
    scenarioSearch(authHeaders);
  } else {
    scenarioCreate(authHeaders);
  }

  // Realistic think time between actions: 1–5 seconds
  sleep(1 + Math.random() * 4);
}

// ---------------------------------------------------------------------------
// Scenario: Browse
// ---------------------------------------------------------------------------

function scenarioBrowse(headers) {
  group("browse bookmarks", () => {
    // List bookmarks — first page
    const listRes = http.get(`${BASE_URL}/api/bookmarks?limit=20`, {
      headers,
    });
    bookmarkListTrend.add(listRes.timings.duration);

    const listOk = check(listRes, {
      "browse: list status 200": (r) => r.status === 200,
      "browse: returns data array": (r) =>
        Array.isArray(r.json("data.bookmarks")),
    });
    errorRate.add(!listOk);

    if (!listOk || !listRes.json("data.bookmarks")) return;

    // Open detail for a random bookmark (if any exist)
    const bookmarks = listRes.json("data.bookmarks");
    if (bookmarks.length > 0) {
      const picked = bookmarks[Math.floor(Math.random() * bookmarks.length)];

      const detailRes = http.get(`${BASE_URL}/api/bookmarks/${picked.id}`, {
        headers,
      });
      const detailOk = check(detailRes, {
        "browse: detail status 200": (r) => r.status === 200,
      });
      errorRate.add(!detailOk);
    }

    // List collections
    const collRes = http.get(`${BASE_URL}/api/collections`, { headers });
    const collOk = check(collRes, {
      "browse: collections status 200": (r) => r.status === 200,
    });
    errorRate.add(!collOk);
  });
}

// ---------------------------------------------------------------------------
// Scenario: Search
// ---------------------------------------------------------------------------

const SAMPLE_QUERIES = [
  "react hooks",
  "typescript tutorial",
  "web performance",
  "css grid layout",
  "node.js express",
  "database design",
  "machine learning",
  "open source tools",
];

function scenarioSearch(headers) {
  group("full-text search", () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    const url = `${BASE_URL}/api/search?q=${encodeURIComponent(q)}&limit=20`;

    const res = http.get(url, { headers });
    searchTrend.add(res.timings.duration);

    const ok = check(res, {
      "search: status 200": (r) => r.status === 200,
      "search: results array present": (r) =>
        Array.isArray(r.json("data.results")),
    });
    errorRate.add(!ok);
  });
}

// ---------------------------------------------------------------------------
// Scenario: Create bookmark
// ---------------------------------------------------------------------------

const SAMPLE_URLS = [
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "https://react.dev/learn",
  "https://www.typescriptlang.org/docs/handbook/intro.html",
  "https://vitejs.dev/guide/",
  "https://tailwindcss.com/docs/installation",
  "https://www.postgresql.org/docs/16/index.html",
  "https://redis.io/docs/",
  "https://www.prisma.io/docs/getting-started",
  "https://expressjs.com/en/5x/api.html",
  "https://zod.dev/?id=introduction",
];

function scenarioCreate(headers) {
  group("create bookmark", () => {
    const url = SAMPLE_URLS[Math.floor(Math.random() * SAMPLE_URLS.length)];

    // Append a unique suffix to avoid duplicate-detection warnings
    const uniqueUrl = `${url}?k6=${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const payload = JSON.stringify({
      url: uniqueUrl,
      title: `k6 Load Test — ${new Date().toISOString()}`,
      description: "Auto-created by k6 load test script",
    });

    const res = http.post(`${BASE_URL}/api/bookmarks`, payload, { headers });
    createBookmarkTrend.add(res.timings.duration);

    const ok = check(res, {
      "create: status 201": (r) => r.status === 201,
      "create: id in response": (r) => r.json("data.id") !== undefined,
    });
    errorRate.add(!ok);

    if (ok) bookmarksCreated.add(1);
  });
}

// ---------------------------------------------------------------------------
// Teardown — runs once after all VUs finish
// ---------------------------------------------------------------------------

/**
 * Optional cleanup. Mind Palace does not require teardown, but this hook
 * can be used to delete load-test data if necessary.
 */
export function teardown(data) {
  // No teardown required for read-only operations.
  // Bookmarks created during the test can be cleaned up via the bulk delete
  // endpoint or by running `pnpm --filter api run db:seed` to reset.
  console.log(
    `Load test complete. Access token used: ${data.accessToken ? "[present]" : "[missing]"}`,
  );
}
