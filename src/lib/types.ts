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

export type Language = 'tr' | 'en';

export interface Dictionary {
  [key: string]: string;
}
