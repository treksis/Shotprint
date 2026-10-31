-- MuseClone Viral Video Reverse-Engineering & Remix Engine
-- Cloudflare D1 (SQLite) Database Schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Product Reveal',
  views_count TEXT NOT NULL DEFAULT '1.2M views',
  source_platform TEXT NOT NULL DEFAULT 'TikTok',
  source_video_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  duration_sec REAL NOT NULL,
  blueprint_json TEXT NOT NULL,
  sam_tracking_json TEXT,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  template_title TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL DEFAULT 'Consumer Product',
  product_brief TEXT NOT NULL,
  product_image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'storyboard_ready',
  final_video_url TEXT NOT NULL DEFAULT '',
  fidelity_report_json TEXT,
  pipeline_logs_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_index INTEGER NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  duration REAL NOT NULL,
  shot_type TEXT NOT NULL,
  camera_movement TEXT NOT NULL,
  adapted_image_prompt TEXT NOT NULL,
  adapted_motion_prompt TEXT NOT NULL,
  script_overlay TEXT NOT NULL DEFAULT '',
  keyframe_url TEXT NOT NULL,
  video_clip_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'keyframe_ready',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_cache (
  hash TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  response_json TEXT NOT NULL,
  asset_url TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_is_preset ON templates(is_preset);
CREATE INDEX IF NOT EXISTS idx_projects_template_id ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_project_scenes_project_id ON project_scenes(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_ai_cache_provider ON ai_cache(provider);

-- Studio (agent chat + production canvas). Phase 1 keeps the canvas and chat as one JSON document
-- per project; normalised items/versions/edges tables follow when the agent writes server-side.
CREATE TABLE IF NOT EXISTS studio_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  thumbnail TEXT,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_studio_projects_updated ON studio_projects (updated_at DESC);
