-- Template Folders: organize master templates into named folders
-- Run this migration in Supabase SQL editor

CREATE TABLE template_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- FK on campaigns — deleting a folder moves its templates back to "Uncategorized"
ALTER TABLE campaigns ADD COLUMN template_folder_id UUID REFERENCES template_folders(id) ON DELETE SET NULL;
