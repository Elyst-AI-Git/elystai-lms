/**
 * Event taxonomy for the LMS (spec D4). Dot-namespaced, append-only names —
 * every learner/admin mutation logs exactly one of these via logEvent().
 * Nothing in src/app may pass a string literal as an event name; only these
 * consts, so a future split into learning_events/audit_log stays a cheap
 * migration.
 */
export const LMS_EVENTS = {
  learner: {
    lesson: {
      viewed: "learner.lesson.viewed",
      completed: "learner.lesson.completed",
      uncompleted: "learner.lesson.uncompleted",
    },
    video: {
      heartbeat: "learner.video.heartbeat",
    },
    submission: {
      created: "learner.submission.created",
      updated: "learner.submission.updated",
    },
    vault: {
      viewed: "learner.vault.viewed",
    },
  },
  admin: {
    content: {
      created: "admin.content.created",
      updated: "admin.content.updated",
      deleted: "admin.content.deleted",
      reordered: "admin.content.reordered",
    },
    submission: {
      reviewed: "admin.submission.reviewed",
    },
  },
} as const;
