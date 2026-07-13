import http from "k6/http";
import { check, sleep } from "k6";

// ============================================================================
// ⚠️  DO NOT run this against `next dev`. The dev server is a single,
// un-optimised process and will fall over at ~50 VUs — that measures nothing
// about production. Load-test a PRODUCTION build:
//
//     npm run build && npm start        # local prod server on :3000
//     # or point BASE_URL at a Vercel preview/prod deploy
//     BASE_URL=https://app.elystai.com k6 run tests/load/k6-load.js
//
// Pass an enrolled session cookie via K6_COOKIE to exercise gated routes and a
// real unlocked lesson id via K6_LESSON for the study/burst scenarios:
//     export K6_COOKIE="sb-<ref>-auth-token=base64-...."
//     export K6_LESSON="<uuid of an unlocked lesson>"
// ============================================================================

const BASE = __ENV.BASE_URL || "http://localhost:3000";
const COOKIE = __ENV.K6_COOKIE || "";
const LESSON = __ENV.K6_LESSON || "";
const authHeaders = COOKIE ? { "Content-Type": "application/json", Cookie: COOKIE } : { "Content-Type": "application/json" };

export const options = {
  scenarios: {
    // A. Launch-night login spike: everyone hits /login then /learn at once.
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
    // C. Mark-complete burst near the end of a live session (~100 at once).
    //    Opt-in: only runs when a cookie + lesson id are supplied (it mutates
    //    lesson_progress for the enrolled user on TEST — harmless, self-cleaning
    //    since it toggles complete then not-complete).
    markBurst: {
      executor: "per-vu-iterations",
      vus: COOKIE && LESSON ? 100 : 0,
      iterations: 1,
      startTime: "10m",
      exec: "markComplete",
    },
    // D. Abuse burst against the KNOWN-unauthenticated /api/events (handoff 003).
    //    Measures whether unauthenticated write spam degrades the app. This is a
    //    finding-generator, not a fix.
    eventAbuse: {
      executor: "constant-arrival-rate",
      rate: 200,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      startTime: "11m",
      exec: "abuse",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"], // p95 under 1.5s
    http_req_failed: ["rate<0.01"],    // <1% errors
  },
};

export function browse() {
  const login = http.get(`${BASE}/login`);
  check(login, { "login 200": (r) => r.status === 200 });
  const params = COOKIE ? { headers: { Cookie: COOKIE } } : {};
  const learn = http.get(`${BASE}/learn`, params);
  check(learn, { "learn ok": (r) => [200, 302, 307].includes(r.status) });
  sleep(Math.random() * 3 + 1);
}

export function study() {
  if (!COOKIE) return;
  const params = { headers: { Cookie: COOKIE } };
  http.get(`${BASE}/learn/vault`, params);
  http.post(`${BASE}/api/learn/heartbeat`, JSON.stringify({ lessonId: LESSON, positionSeconds: 30 }), { headers: authHeaders });
  sleep(15);
}

export function markComplete() {
  const done = http.post(`${BASE}/api/learn/progress`, JSON.stringify({ lessonId: LESSON, completed: true }), { headers: authHeaders });
  check(done, { "mark ok": (r) => r.status === 200 });
  sleep(1);
  // revert so the burst leaves no residual completion state
  http.post(`${BASE}/api/learn/progress`, JSON.stringify({ lessonId: LESSON, completed: false }), { headers: authHeaders });
}

export function abuse() {
  http.post(`${BASE}/api/events`, JSON.stringify({ name: "learner.dashboard.viewed", payload: {} }), { headers: { "Content-Type": "application/json" } });
}
