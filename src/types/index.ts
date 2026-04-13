export interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  phase: 'content' | 'design';
  created_at: string;
  updated_at: string;
}

export interface Slide {
  id: string;
  project_id: string;
  order: number;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'image-text' | 'bullets' | 'timeline' | 'numbers';
  icon?: string;
  color?: string;
  background?: string;
  font_size?: string;
  image_url?: string;
  chart_data?: string;
  presenter_notes?: string;
  talking_points?: string[] | { [key: string]: unknown }[];
  suggested_duration?: number;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  file_path: string;
  file_type: string;
  status?: string;
  type?: string;
  content?: string;
  created_at: string;
}

export interface Insight {
  id: string;
  project_id: string;
  type: string;
  content: string;
  created_at: string;
}

export interface Recording {
  id: string;
  project_id: string;
  filename: string;
  file_path: string;
  transcription?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}
