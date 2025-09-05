create extension if not exists pgcrypto;

create table if not exists departments(id uuid primary key default gen_random_uuid(), name text unique not null);
create table if not exists roles(id uuid primary key default gen_random_uuid(), name text unique not null);
create table if not exists profiles(user_id uuid primary key references auth.users(id) on delete cascade, full_name text, role_id uuid references roles(id), department_id uuid references departments(id));
create table if not exists recipients(id uuid primary key default gen_random_uuid(), label text not null, email text);
create table if not exists templates(id uuid primary key default gen_random_uuid(), name text not null, department_id uuid references departments(id), frequency text check (frequency in ('daily','weekly','monthly','adhoc')) default 'daily', version int not null default 1, is_active boolean not null default true, meta jsonb default '{}'::jsonb, created_by uuid references auth.users(id), created_at timestamptz default now());
create table if not exists sections(id uuid primary key default gen_random_uuid(), template_id uuid references templates(id) on delete cascade, name text not null, sort_order int not null default 1);
create table if not exists items(id uuid primary key default gen_random_uuid(), section_id uuid references sections(id) on delete cascade, prompt text not null, type text not null, required boolean default true, config jsonb default '{}'::jsonb, sort_order int not null default 1);
create table if not exists template_recipients(template_id uuid references templates(id) on delete cascade, recipient_id uuid references recipients(id) on delete cascade, primary key(template_id,recipient_id));
create table if not exists runs(id uuid primary key default gen_random_uuid(), template_id uuid references templates(id), template_version int not null, scheduled_for date, assignee uuid references auth.users(id), status text check (status in ('assigned','in_progress','submitted','approved','rejected')) default 'assigned', started_at timestamptz, completed_at timestamptz, created_at timestamptz default now());
create table if not exists responses(id uuid primary key default gen_random_uuid(), run_id uuid references runs(id) on delete cascade, item_id uuid references items(id), value_text text, value_number numeric, value_json jsonb, is_out_of_spec boolean default false, created_by uuid references auth.users(id), created_at timestamptz default now());
create table if not exists attachments(id uuid primary key default gen_random_uuid(), run_id uuid references runs(id) on delete cascade, item_id uuid references items(id), file_path text not null, created_at timestamptz default now());

alter table profiles enable row level security;
alter table templates enable row level security;
alter table sections enable row level security;
alter table items enable row level security;
alter table runs enable row level security;
alter table responses enable row level security;
alter table attachments enable row level security;

create policy if not exists sel_templates on templates for select using (true);
create policy if not exists sel_sections on sections for select using (true);
create policy if not exists sel_items on items for select using (true);
create policy if not exists sel_runs on runs for select using (true);
create policy if not exists sel_responses on responses for select using (true);
create policy if not exists sel_attachments on attachments for select using (true);

create policy if not exists iu_templates on templates for all using (true) with check (true);
create policy if not exists iu_sections on sections for all using (true) with check (true);
create policy if not exists iu_items on items for all using (true) with check (true);
create policy if not exists iu_runs on runs for all using (true) with check (true);
create policy if not exists iu_responses on responses for all using (true) with check (true);
create policy if not exists iu_attachments on attachments for all using (true) with check (true);
