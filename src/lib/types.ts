export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  category: ProjectCategory;
  primary_language: string;
  file_structure: string;
  files: GeneratedFile[];
  install_guide: string;
  tags: string[];
  performance_analysis: string;
  seo_analysis: string;
  owner_token: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectCategory =
  | 'python'
  | 'javascript'
  | 'php'
  | 'web'
  | 'api'
  | 'automation'
  | 'prompt';

export interface GenerationResult {
  title: string;
  description: string;
  category: ProjectCategory;
  primary_language: string;
  file_structure: string;
  files: GeneratedFile[];
  install_guide: string;
  tags: string[];
  performance_analysis: string;
  seo_analysis: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  path: string;
  content: string;
  language: string;
  size_bytes: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  content: string;
  media: { type: 'image' | 'video' | 'embed'; url: string }[];
  parent_id: string | null;
  is_flagged: boolean;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSetting {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export type Language = 'tr' | 'en';

export interface Dictionary {
  [key: string]: string;
}
