-- Add phase column to projects
alter table projects add column if not exists phase text default 'content';

-- Add styling columns to slides
alter table slides add column if not exists background text;
alter table slides add column if not exists font_size text;

-- Create chat messages table
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table chat_messages enable row level security;

-- RLS Policies for chat
create policy "Users can view chat in own projects" on chat_messages for select using (
  exists (select 1 from projects where projects.id = chat_messages.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage chat in own projects" on chat_messages for all using (
  exists (select 1 from projects where projects.id = chat_messages.project_id and projects.user_id = auth.uid())
);
