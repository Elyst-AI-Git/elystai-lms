import { makeAdminCrudHandlers } from "@/lib/lms/admin-api";

export const { POST, PATCH, DELETE } = makeAdminCrudHandlers({
  table: "modules",
  fields: ["course_id", "title", "position"],
  orderColumn: "position",
});
