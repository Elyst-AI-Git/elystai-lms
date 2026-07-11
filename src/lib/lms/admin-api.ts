import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/lms/auth";
import { LMS_EVENTS } from "@/lib/lms/events";
import { logEvent } from "@/lib/logging";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * Shared CRUD handler factory for the admin content API (spec D8/T6). Every
 * route: requireAdmin (401/403 JSON), service-role writes, exactly one
 * admin.content.* event per mutation with the actor's profile_id.
 *
 * PATCH accepts either { id, ...fields } for an update or
 * { reorder: [{ id, position }] } for bulk reordering.
 */
export function makeAdminCrudHandlers(options: {
  table: string;
  /** Whitelisted writable columns - anything else in the body is dropped. */
  fields: string[];
  /** Column used by reorder (e.g. "position" or "sort_order"). */
  orderColumn?: string;
  /** Fill/derive columns before insert (e.g. slug from title). */
  prepareInsert?: (row: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { table, fields, orderColumn, prepareInsert } = options;

  function pick(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of fields) {
      if (key in body) out[key] = body[key] === "" ? null : body[key];
    }
    return out;
  }

  async function guard() {
    const user = await isAdmin();
    if (!user) {
      return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { user, response: null };
  }

  async function POST(req: NextRequest) {
    const { user, response } = await guard();
    if (!user) return response!;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .schema("app")
      .from(table)
      .insert(prepareInsert ? prepareInsert(pick(body)) : pick(body))
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logEvent({
      event: LMS_EVENTS.admin.content.created,
      profileId: user.id,
      payload: { table, id: data.id },
    });
    return NextResponse.json({ ok: true, row: data });
  }

  async function PATCH(req: NextRequest) {
    const { user, response } = await guard();
    if (!user) return response!;
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const admin = createAdminSupabaseClient();

    if (Array.isArray(body.reorder)) {
      if (!orderColumn) {
        return NextResponse.json({ error: "Reorder not supported here" }, { status: 400 });
      }
      for (const item of body.reorder as { id?: unknown; position?: unknown }[]) {
        if (typeof item.id !== "string" || typeof item.position !== "number") {
          return NextResponse.json({ error: "Bad reorder payload" }, { status: 400 });
        }
        const { error } = await admin
          .schema("app")
          .from(table)
          .update({ [orderColumn]: item.position })
          .eq("id", item.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      }
      await logEvent({
        event: LMS_EVENTS.admin.content.reordered,
        profileId: user.id,
        payload: { table, count: (body.reorder as unknown[]).length },
      });
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updates = pick(body);
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    const { error } = await admin.schema("app").from(table).update(updates).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logEvent({
      event: LMS_EVENTS.admin.content.updated,
      profileId: user.id,
      payload: { table, id: body.id, fields: Object.keys(updates) },
    });
    return NextResponse.json({ ok: true });
  }

  async function DELETE(req: NextRequest) {
    const { user, response } = await guard();
    if (!user) return response!;
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const admin = createAdminSupabaseClient();
    const { error } = await admin.schema("app").from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await logEvent({
      event: LMS_EVENTS.admin.content.deleted,
      profileId: user.id,
      payload: { table, id },
    });
    return NextResponse.json({ ok: true });
  }

  return { POST, PATCH, DELETE };
}
