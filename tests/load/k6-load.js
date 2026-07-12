import http from "k6/http";
import { check, sleep } from "k6";

// Simulates the realistic launch-night mix against the running dev server.
// Public pages + authenticated dashboard. Pass an enrolled session cookie via
// K6_COOKIE (mint it the same way global-setup does) to exercise gated routes.
const BASE = __ENV.BASE_URL || "http://localhost:3000";
const COOKIE = __ENV.K6_COOKIE || ""; // "sb-<ref>-auth-token=base64-...."

export const options = {
  scenarios: {
    // A. Launch-night login spike: everyone hits /login then /learn.
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 150 },
        { duration: "2m", target: 150 },
        { duration: "30s", target: 0 },
      ],
      exec: "browse",
    },
    // B. Sustained lesson viewing + heartbeat telemetry.
    soak: {
      executor: "constant-vus",
      vus: 20,
      duration: "5m",
      startTime: "4m30s",
      exec: "study",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"], // p95 under 1.5s
    http_req_failed: ["rate<0.01"],     // <1% errors
  },
};

export function browse() {
  const login = http.get(`${BASE}/login`);
  check(login, { "login 200": (r) => r.status === 200 });
  const params = COOKIE ? { headers: { Cookie: COOKIE } } : {};
  const learn = http.get(`${BASE}/learn`, params);
  check(learn, { "learn ok": (r) => r.status === 200 || r.status === 307 || r.status === 302 });
  sleep(Math.random() * 3 + 1);
}

export function study() {
  if (!COOKIE) return;
  const params = { headers: { Cookie: COOKIE } };
  http.get(`${BASE}/learn/vault`, params);
  http.post(`${BASE}/api/learn/heartbeat`, JSON.stringify({ lessonId: __ENV.K6_LESSON || "" }), {
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
  });
  sleep(15);
}
