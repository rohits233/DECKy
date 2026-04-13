-- Pipeline schema for AI-native consulting SaaS
-- Extends existing schema with document processing, insights, jobs

-- Extend documents for pipeline
alter table documents add column if not exists content text;
alter table documents add column if not exists status text default 'pending'; -- pending, processing, ready, failed
alter table documents add column if not exists type text default 'research'; -- research, transcript, memo
alter table documents add column if not exists metadata jsonb default '{}';
alter table documents add column if not exists processed_at timestamp with time zone;

-- Document chunks for RAG (without vector first - add embedding column if pgvector works)
create table if not exists document_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade not null,
  chunk_index integer not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

create index idx_document_chunks_document_id on document_chunks(document_id);

-- Insights
create table if not exists insights (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  document_id uuid references documents(id) on delete cascade,
  type text not null, -- finding, quote, recommendation, risk, opportunity
  content text not null,
  evidence jsonb default '[]',
  confidence float default 1.0,
  created_at timestamp with time zone default now()
);

create index idx_insights_project_id on insights(project_id);
create index idx_insights_document_id on insights(document_id);

-- Pipeline jobs
create table if not exists pipeline_jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id) on delete cascade not null,
  type text not null, -- document_ingest, chunk, insight, slide_gen, script_gen, full_pipeline
  status text not null default 'queued', -- queued, running, completed, failed
  payload jsonb default '{}',
  result jsonb,
  error text,
  tokens_used integer default 0,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index idx_pipeline_jobs_project_status on pipeline_jobs(project_id, status);
create index idx_pipeline_jobs_status on pipeline_jobs(status) where status in ('queued', 'running');

-- Presenter notes on slides
alter table slides add column if not exists presenter_notes text;
alter table slides add column if not exists talking_points jsonb default '[]';
alter table slides add column if not exists suggested_duration integer;

-- RLS for new tables
alter table document_chunks enable row level security;
alter table insights enable row level security;
alter table pipeline_jobs enable row level security;

create policy "Users can view chunks in own projects" on document_chunks for select using (
  exists (
    select 1 from documents d
    join projects p on p.id = d.project_id
    where d.id = document_chunks.document_id and p.user_id = auth.uid()
  )
);

create policy "Users can view insights in own projects" on insights for select using (
  exists (select 1 from projects where projects.id = insights.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage insights in own projects" on insights for all using (
  exists (select 1 from projects where projects.id = insights.project_id and projects.user_id = auth.uid())
);

create policy "Users can view jobs in own projects" on pipeline_jobs for select using (
  exists (select 1 from projects where projects.id = pipeline_jobs.project_id and projects.user_id = auth.uid())
);
create policy "Users can manage jobs in own projects" on pipeline_jobs for all using (
  exists (select 1 from projects where projects.id = pipeline_jobs.project_id and projects.user_id = auth.uid())
);
