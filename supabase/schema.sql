-- Ingrado database schema (Supabase / Postgres).
-- Mirrors the local-storage shapes in js/store.js so guest history can be
-- synced up when a user creates an account.

-- Users are managed by Supabase Auth (auth.users). This profile table holds
-- app-specific data.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  preferences jsonb not null default '{}'::jsonb
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  product_name text not null default '',
  brand text not null default '',
  image_url text,                       -- Supabase Storage path; null once user deletes the image
  extracted_text jsonb,                 -- { productName, brand, ingredientsText, nutritionText, source }
  analysis_json jsonb not null,         -- schema-valid analysis (see js/schema.js)
  overall_score numeric(3,1) not null,
  created_at timestamptz not null default now(),
  is_favorite boolean not null default false
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  first_scan_id uuid references public.scans (id) on delete cascade,
  second_scan_id uuid references public.scans (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Row-level security: users only see their own rows.
alter table public.profiles enable row level security;
alter table public.scans enable row level security;
alter table public.comparisons enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own scans" on public.scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own comparisons" on public.comparisons
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
