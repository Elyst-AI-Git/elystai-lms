import { makeAdminCrudHandlers } from "@/lib/lms/admin-api";

export const { POST, PATCH, DELETE } = makeAdminCrudHandlers({
  table: "courses",
  fields: ["slug", "title", "description", "status"],
  prepareInsert: (row) => ({
    ...row,
    slug:
      row.slug ??
      `${String(row.title ?? "course").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 6)}`,
  }),
});
