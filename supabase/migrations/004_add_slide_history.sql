-- Create slide history table for undo functionality
create table if not exists slide_history (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  snapshot jsonb not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table slide_history enable row level security;

-- RLS Policies
create policy "Users can view history in own projects" on slide_history for select using (
  exists (select 1 from projects where projects.id = slide_history.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage history in own projects" on slide_history for all using (
  exists (select 1 from projects where projects.id = slide_history.project_id and projects.user_id = auth.uid())
);
