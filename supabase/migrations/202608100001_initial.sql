create extension if not exists pgcrypto;

create type public.member_role as enum ('owner','admin','manager','staff','vet','finance','viewer');
create type public.member_status as enum ('invited','active','suspended');
create type public.horse_sex as enum ('male','female','gelding');
create type public.horse_status as enum ('active','sold','deceased','transferred');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  city text,
  state text check (state is null or char_length(state) = 2),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  status public.member_status not null default 'invited',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.horses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  registration_number text,
  sex public.horse_sex not null,
  breed text not null default 'Mangalarga Marchador',
  birth_date date,
  coat text,
  sire_name text,
  dam_name text,
  status public.horse_status not null default 'active',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, registration_number)
);

create index idx_memberships_user_status on public.memberships(user_id, status);
create index idx_horses_organization_status on public.horses(organization_id, status);
create index idx_horses_organization_name on public.horses(organization_id, name);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where organization_id = org_id and user_id = auth.uid() and status = 'active');
$$;

create or replace function public.can_manage_org(org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where organization_id = org_id and user_id = auth.uid() and status = 'active' and role in ('owner','admin','manager'));
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name) values(new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.create_haras(haras_name text, haras_city text default null, haras_state text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; new_slug text;
begin
  if auth.uid() is null then raise exception 'Acesso não autenticado'; end if;
  new_slug := trim(both '-' from lower(regexp_replace(haras_name, '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(gen_random_uuid()::text, 1, 8);
  insert into public.organizations(name, slug, city, state, created_by) values(haras_name, new_slug, haras_city, upper(haras_state), auth.uid()) returning id into new_id;
  insert into public.memberships(organization_id, user_id, role, status) values(new_id, auth.uid(), 'owner', 'active');
  return new_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.horses enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy organizations_member_select on public.organizations for select using (public.is_org_member(id));
create policy memberships_member_select on public.memberships for select using (public.is_org_member(organization_id));
create policy horses_member_select on public.horses for select using (public.is_org_member(organization_id));
create policy horses_manager_insert on public.horses for insert with check (public.can_manage_org(organization_id));
create policy horses_manager_update on public.horses for update using (public.can_manage_org(organization_id)) with check (public.can_manage_org(organization_id));
create policy horses_manager_delete on public.horses for delete using (public.can_manage_org(organization_id));

revoke all on function public.create_haras(text,text,text) from public;
revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.can_manage_org(uuid) from public;
grant execute on function public.create_haras(text,text,text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.organizations, public.memberships to authenticated;
grant select, insert, update, delete on public.horses to authenticated;
