-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Slides table
create table slides (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  "order" integer not null,
  title text not null,
  content text not null,
  layout text not null default 'content',
  icon text,
  color text,
  created_at timestamp with time zone default now()
);

-- Documents table
create table documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  filename text not null,
  file_path text not null,
  file_type text not null,
  created_at timestamp with time zone default now()
);

-- Recordings table
create table recordings (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  filename text not null,
  file_path text not null,
  transcription text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table slides enable row level security;
alter table documents enable row level security;
alter table recordings enable row level security;

-- RLS Policies
create policy "Users can view own projects" on projects for select using (auth.uid() = user_id);
create policy "Users can create own projects" on projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on projects for delete using (auth.uid() = user_id);

create policy "Users can view slides in own projects" on slides for select using (
  exists (select 1 from projects where projects.id = slides.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage slides in own projects" on slides for all using (
  exists (select 1 from projects where projects.id = slides.project_id and projects.user_id = auth.uid())
);

create policy "Users can view documents in own projects" on documents for select using (
  exists (select 1 from projects where projects.id = documents.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage documents in own projects" on documents for all using (
  exists (select 1 from projects where projects.id = documents.project_id and projects.user_id = auth.uid())
);

create policy "Users can view recordings in own projects" on recordings for select using (
  exists (select 1 from projects where projects.id = recordings.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage recordings in own projects" on recordings for all using (
  exists (select 1 from projects where projects.id = recordings.project_id and projects.user_id = auth.uid())
);

-- Storage buckets
insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false);

-- Storage policies
create policy "Users can upload own documents" on storage.objects for insert with check (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Users can view own documents" on storage.objects for select using (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can upload own recordings" on storage.objects for insert with check (
  bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Users can view own recordings" on storage.objects for select using (
  bucket_id = 'recordings' and auth.uid()::text = (storage.foldername(name))[1]
);
