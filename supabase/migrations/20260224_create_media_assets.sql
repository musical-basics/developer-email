-- Content-Addressable Storage: media_assets table
-- Decouples the UI view (folders, filenames) from the physical storage bucket.
-- Moving or deleting assets only updates this table — actual bucket files are never touched.

create table media_assets (
  id uuid default uuid_generate_v4() primary key,
  filename text not null,
  folder_path text default '',
  storage_hash text not null,
  public_url text not null,
  size integer,
  is_deleted boolean default false,
  created_at timestamp with time zone default now()
);

-- Fast lookup for UI listing (active assets in a folder)
create index idx_media_assets_folder on media_assets(folder_path) where is_deleted = false;

-- Fast dedup check when uploading
create index idx_media_assets_hash on media_assets(storage_hash);

alter table media_assets enable row level security;

create policy "Allow authenticated select" on media_assets for select to authenticated using (true);
create policy "Allow authenticated insert" on media_assets for insert to authenticated with check (true);
create policy "Allow authenticated update" on media_assets for update to authenticated using (true);
create policy "Allow authenticated delete" on media_assets for delete to authenticated using (true);
