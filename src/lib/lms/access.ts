/**
 * Pure access decision used by the learner entry gate. Keeping this separate
 * from Supabase means every caller follows the same, easily verified rules.
 */
export type AccessDecision = "login" | "denied" | "ok";

export interface EnrollmentLike {
  status: string;
  batch: { course_id: string };
}

export function resolveAccess(
  hasSession: boolean,
  enrollments: EnrollmentLike[],
  courseId: string
): AccessDecision {
  if (!hasSession) return "login";

  const hasActiveEnrollment = enrollments.some(
    (enrollment) =>
      enrollment.status === "active" && enrollment.batch.course_id === courseId
  );

  return hasActiveEnrollment ? "ok" : "denied";
}
