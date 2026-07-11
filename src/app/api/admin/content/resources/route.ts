import { makeAdminCrudHandlers } from "@/lib/lms/admin-api";

export const { POST, PATCH, DELETE } = makeAdminCrudHandlers({
  table: "resources",
  fields: ["course_id", "batch_id", "module_id", "lesson_id", "title", "description", "url_or_storage_path", "kind", "sort_order"],
  orderColumn: "sort_order",
});
