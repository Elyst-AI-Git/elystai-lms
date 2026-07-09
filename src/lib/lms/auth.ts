import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Per-request auth gates (spec D5): no middleware.ts — every /learn and
 * /admin entry point calls one of these. They are convenience + UX; RLS
 * remains the real security boundary. Auth/enrollment state is never cached.
 */

export interface EnrollmentContext {
  user: User;
  enrollment: {
    id: string;
    batch_id: string;
    status: string;
  };
  batch: {
    id: string;
    course_id: string;
    name: string;
    starts_on: string;
  };
  course: {
    id: string;
    slug: string;
    title: string;
  };
}

/** Redirects to /register when there is no authenticated user. */
export async function requireUser(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/register");
  return user;
}

/**
 * Returns the user's ACTIVE enrollment (+ batch + course) for the course, or
 * redirects to the course landing page. If several active enrollments exist
 * (spec A2 edge case), picks the most recent.
 */
export async function requireEnrollment(
  courseSlug: string
): Promise<EnrollmentContext> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: course } = await supabase
    .schema("app")
    .from("courses")
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .single();
  if (!course) notFound();

  const { data: enrollments } = await supabase
    .schema("app")
    .from("enrollments")
    .select("id, batch_id, status, created_at, batches!inner(id, course_id, name, starts_on)")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .eq("batches.course_id", course.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const enrollment = enrollments?.[0];
  if (!enrollment) redirect(`/${courseSlug}`);

  const batch = Array.isArray(enrollment.batches)
    ? enrollment.batches[0]
    : enrollment.batches;

  return {
    user,
    enrollment: {
      id: enrollment.id,
      batch_id: enrollment.batch_id,
      status: enrollment.status,
    },
    batch,
    course,
  };
}

/**
 * API-route variants: return null instead of redirecting so route handlers
 * can answer 401/403 JSON (redirects make no sense on fetch calls).
 */
export async function getUserOrNull(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolves the caller's ACTIVE enrollment for the course a lesson belongs
 * to — the ownership chain every learner mutation route needs. Null when the
 * lesson doesn't exist (or is invisible to the caller via RLS) or the caller
 * has no active enrollment.
 */
export async function getEnrollmentForLesson(lessonId: string): Promise<
  | {
      user: User;
      enrollmentId: string;
      batchStartsOn: string;
      lesson: { id: string; content_type: string; unlock_day_offset: number; is_preview: boolean };
    }
  | null
> {
  const user = await getUserOrNull();
  if (!user) return null;
  const supabase = await createServerSupabaseClient();

  const { data: lesson } = await supabase
    .schema("app")
    .from("lessons")
    .select("id, content_type, unlock_day_offset, is_preview, modules!inner(course_id)")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return null;
  const moduleRow = Array.isArray(lesson.modules) ? lesson.modules[0] : lesson.modules;

  const { data: enrollments } = await supabase
    .schema("app")
    .from("enrollments")
    .select("id, created_at, batches!inner(course_id, starts_on)")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .eq("batches.course_id", moduleRow.course_id)
    .order("created_at", { ascending: false })
    .limit(1);
  const enrollment = enrollments?.[0];
  if (!enrollment) return null;
  const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches;

  return {
    user,
    enrollmentId: enrollment.id,
    batchStartsOn: batch.starts_on,
    lesson: {
      id: lesson.id,
      content_type: lesson.content_type,
      unlock_day_offset: lesson.unlock_day_offset,
      is_preview: lesson.is_preview,
    },
  };
}

/** True when the user is in public.admin_users. For API routes. */
export async function isAdmin(): Promise<User | null> {
  const user = await getUserOrNull();
  if (!user) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("admin_users")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  return data ? user : null;
}

/**
 * Admin gate (spec D8): membership in public.admin_users. Non-admins get a
 * 404, not a login hint — the admin surface should not advertise itself.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!adminRow) notFound();

  return user;
}
