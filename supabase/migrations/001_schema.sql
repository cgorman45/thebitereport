-- 001_schema.sql
-- Creates profiles, boat_favorites, and trip_watches tables
-- with Row Level Security policies and auto-profile trigger.

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- BOAT FAVORITES
-- ============================================================
create table if not exists public.boat_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  boat_mmsi int not null,
  created_at timestamptz default now(),
  unique(user_id, boat_mmsi)
);

alter table public.boat_favorites enable row level security;

create policy "Users can read own favorites"
  on public.boat_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.boat_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.boat_favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TRIP WATCHES
-- ============================================================
create table if not exists public.trip_watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id text not null,
  boat_name text not null,
  trip_date date not null,
  last_known_spots int,
  notified_selling_out_at timestamptz,
  notified_spots_opened_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, trip_id)
);

alter table public.trip_watches enable row level security;

create policy "Users can read own watches"
  on public.trip_watches for select
  using (auth.uid() = user_id);

create policy "Users can insert own watches"
  on public.trip_watches for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own watches"
  on public.trip_watches for delete
  using (auth.uid() = user_id);

-- Service role needs to update last_known_spots and notified_* columns
-- (cron job runs server-side with service role key, bypasses RLS)
