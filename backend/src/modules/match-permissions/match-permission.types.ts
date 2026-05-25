export interface GrantPermissionBody {
  userId: string;
  permissionType: "score_update" | "match_admin" | "view_only";
}

export interface PermissionCheckResponse {
  canUpdateScore: boolean;
  permissionType?: string | null;
}