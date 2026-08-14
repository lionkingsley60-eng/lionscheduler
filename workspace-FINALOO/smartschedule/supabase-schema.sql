-- SmartSchedule Supabase schema
-- Run this entire file once in Supabase Dashboard → SQL Editor → New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'Personal',
  location text not null default '',
  timezone text not null default 'Africa/Accra',
  work_start time not null default '08:00',
  work_end time not null default '18:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('Personal','Student','Professional','Freelancer','Business owner')),
  constraint profiles_work_hours_check check (work_end > work_start)
);

create table if not exists public.schedule_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id),
  constraint schedule_items_kind_check check (kind in ('task','event','availability'))
);

create index if not exists schedule_items_user_kind_idx
  on public.schedule_items(user_id, kind);

alter table public.profiles enable row level security;
alter table public.schedule_items enable row level security;

-- A signed-in user can only see and modify their own profile.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Schedule rows are isolated by auth.uid().
drop policy if exists "Users can read own schedule" on public.schedule_items;
create policy "Users can read own schedule"
  on public.schedule_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own schedule" on public.schedule_items;
create policy "Users can insert own schedule"
  on public.schedule_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own schedule" on public.schedule_items;
create policy "Users can update own schedule"
  on public.schedule_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own schedule" on public.schedule_items;
create policy "Users can delete own schedule"
  on public.schedule_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists schedule_items_set_updated_at on public.schedule_items;
create trigger schedule_items_set_updated_at
before update on public.schedule_items
for each row execute function public.set_updated_at();

-- Copy sign-up metadata into a protected profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (
    id, email, full_name, phone, role, location, timezone, work_start, work_end
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Personal'),
    coalesce(new.raw_user_meta_data ->> 'location', ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Africa/Accra'),
    coalesce((new.raw_user_meta_data ->> 'work_start')::time, '08:00'::time),
    coalesce((new.raw_user_meta_data ->> 'work_end')::time, '18:00'::time)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.schedule_items to authenticated;

-- Optional verification after running:
-- select table_name from information_schema.tables
-- where table_schema = 'public' and table_name in ('profiles','schedule_items');
