export type UserRole = "admin" | "member" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Space {
  id: number;
  name: string;
  key: string;
  description: string | null;
  icon: string | null;
  owner_id: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpaceCreate {
  name: string;
  key: string;
  description?: string;
  icon?: string;
  is_private?: boolean;
}

export type PageStatus = "draft" | "published" | "archived";
export type EditMode = "anyone" | "approval";
export type UpdateRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Page {
  id: number;
  space_id: number;
  parent_id: number | null;
  title: string;
  slug: string;
  content_json: Record<string, unknown> | null;
  author_id: number;
  status: PageStatus;
  position: number;
  version: number;
  edit_mode: EditMode;
  last_published_at: string | null;
  last_published_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PageCreate {
  space_id: number;
  parent_id?: number | null;
  title: string;
  content_json?: Record<string, unknown>;
  status?: PageStatus;
}

export interface PageUpdate {
  title?: string;
  content_json?: Record<string, unknown>;
  status?: PageStatus;
  parent_id?: number | null;
  position?: number;
}

export interface PageTreeItem {
  id: number;
  title: string;
  slug: string;
  parent_id: number | null;
  position: number;
  status: PageStatus;
  children: PageTreeItem[];
}

export interface PageVersion {
  id: number;
  page_id: number;
  content_json: Record<string, unknown> | null;
  title: string | null;
  version: number;
  author_id: number;
  change_summary: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export interface UpdateRequest {
  id: number;
  page_id: number;
  requester_id: number;
  title: string;
  content_json: Record<string, unknown> | null;
  content_text: string | null;
  message: string | null;
  status: UpdateRequestStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiffStats {
  additions: number;
  deletions: number;
  unchanged: number;
  total_changes: number;
}

export interface VersionDiff {
  from_version: number;
  to_version: number;
  text_diff: Array<[number, string]>;
  stats: DiffStats;
}

export interface FileUploadResponse {
  filename: string;
  path: string;
  url: string;
  size: number;
  content_type: string;
}
