import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const REF = new URL(SUPABASE_URL).host.split(".")[0];
const PASSWORD = "probe-rls-Passw0rd!";
const USERS = {
  enrolled: "probe-enrolled@test.elystai.local",
  outsider: "probe-outsider@test.elystai.local",
  admin: "probe-admin@test.elystai.local",
};

async function mint(email: string) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error(`mint ${email} failed: ${JSON.stringify(d)}`);
  const sess = {
    access_token: d.access_token, token_type: "bearer", expires_in: d.expires_in,
    expires_at: d.expires_at, refresh_token: d.refresh_token, user: d.user,
  };
  return "base64-" + Buffer.from(JSON.stringify(sess)).toString("base64");
}

export default async function globalSetup() {
  const dir = path.join(__dirname, ".auth");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, email] of Object.entries(USERS)) {
    const value = await mint(email);
    const state = {
      cookies: [{
        name: `sb-${REF}-auth-token`, value, domain: "localhost", path: "/",
        expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const,
      }],
      origins: [],
    };
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(state, null, 2));
  }
}
