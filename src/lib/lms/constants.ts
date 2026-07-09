/**
 * V1 runs a single course (spec A2). The learner routes still carry
 * [courseSlug] so multi-course needs no restructure later; this constant is
 * only for entry points that need a default (e.g. /learn root).
 */
export const DEFAULT_COURSE_SLUG = "ai-for-work";

/** Where non-enrolled visitors are sent (the marketing/checkout page). */
export const ENROLL_URL = "https://elystai.com/ai-for-work";

export const MAX_SUBMISSION_BYTES = 5 * 1024 * 1024; // 5 MB (spec A4/OQ3)
export const SUBMISSION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const SIGNED_URL_TTL_SECONDS = 60 * 60; // ≤ 1h (plan risk table)
