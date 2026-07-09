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
