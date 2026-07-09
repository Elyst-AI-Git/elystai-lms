import { makeAdminCrudHandlers } from "@/lib/lms/admin-api";

export const { POST, PATCH, DELETE } = makeAdminCrudHandlers({
  table: "lessons",
  fields: [
    "module_id",
    "title",
    "position",
    "content_type",
    "unlock_day_offset",
    "is_preview",
    "bunny_video_id",
    "duration_seconds",
    "body_richtext",
    "task_instructions",
    "live_link",
    "live_starts_at",
  ],
  orderColumn: "position",
});
