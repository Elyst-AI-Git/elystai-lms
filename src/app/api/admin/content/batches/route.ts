import { makeAdminCrudHandlers } from "@/lib/lms/admin-api";

// Batch schedule editing. `starts_on` is the cohort launch date that drives ALL
// drip unlocks, so it must be settable from the admin console (not just SQL).
export const { POST, PATCH, DELETE } = makeAdminCrudHandlers({
  table: "batches",
  fields: ["course_id", "name", "starts_on", "status"],
});
