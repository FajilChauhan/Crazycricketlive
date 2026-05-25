import { z } from "zod";

export const grantPermissionSchema = z.object({
  userId: z.string().uuid("Invalid userId"),
  permissionType: z.enum(["score_update", "match_admin", "view_only"]),
});