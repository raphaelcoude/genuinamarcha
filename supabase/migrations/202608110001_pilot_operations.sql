alter table public.horses
  add column if not exists microchip text,
  add column if not exists owner_name text,
  add column if not exists location_note text,
  add column if not exists notes text;

alter table public.memberships
  add constraint memberships_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

create type public.facility_type as enum ('stall','paddock','pasture','quarantine','other');
create type public.record_status as enum ('pending','scheduled','completed','cancelled');
create type public.stock_category as enum ('hay','feed','supplement','medicine','material','other');
create type public.finance_type as enum ('expense','income');
create type public.finance_status as enum ('pending','paid','overdue','cancelled');

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type public.facility_type not null default 'stall',
  capacity integer not null default 1 check (capacity > 0),
  current_horse_id uuid references public.horses(id) on delete set null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.facility_occupancies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  horse_id uuid not null references public.horses(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id)
);

create table public.health_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete cascade,
  record_type text not null,
  title text not null,
  event_date date not null default current_date,
  next_due_date date,
  professional text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  status public.record_status not null default 'completed',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category public.stock_category not null default 'other',
  unit text not null default 'un',
  current_stock numeric(12,3) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  supplier text,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('entry','exit','adjustment')),
  quantity numeric(12,3) not null check (quantity > 0),
  occurred_at timestamptz not null default now(),
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete set null,
  title text not null,
  category text not null default 'Geral',
  due_at timestamptz not null,
  assigned_name text,
  status public.record_status not null default 'pending',
  recurrence text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  horse_id uuid references public.horses(id) on delete set null,
  entry_type public.finance_type not null default 'expense',
  category text not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  paid_date date,
  status public.finance_status not null default 'pending',
  supplier text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'viewer',
  status text not null default 'pending' check (status in ('pending','accepted','cancelled')),
  invited_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (organization_id, email)
);

create index idx_facilities_org on public.facilities(organization_id, active);
create index idx_occupancies_org_active on public.facility_occupancies(organization_id, ended_at);
create index idx_health_org_date on public.health_records(organization_id, event_date desc);
create index idx_inventory_org_category on public.inventory_items(organization_id, category);
create index idx_tasks_org_due on public.tasks(organization_id, due_at, status);
create index idx_finance_org_due on public.financial_entries(organization_id, due_date, status);
create index idx_invites_email_status on public.team_invites(email, status);

create or replace function public.track_facility_occupancy()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.current_horse_id is not null then
      insert into public.facility_occupancies(organization_id, facility_id, horse_id)
      values(new.organization_id, new.id, new.current_horse_id);
    end if;
    return new;
  end if;
  if old.current_horse_id is distinct from new.current_horse_id then
    update public.facility_occupancies set ended_at = now()
    where facility_id = new.id and ended_at is null;
    if new.current_horse_id is not null then
      insert into public.facility_occupancies(organization_id, facility_id, horse_id)
      values(new.organization_id, new.id, new.current_horse_id);
    end if;
  end if;
  return new;
end;
$$;
create trigger facilities_track_initial_occupancy after insert on public.facilities
for each row execute procedure public.track_facility_occupancy();
create trigger facilities_track_occupancy after update of current_horse_id on public.facilities
for each row execute procedure public.track_facility_occupancy();

create or replace function public.track_inventory_adjustment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare difference numeric;
begin
  if tg_op = 'INSERT' then
    if new.current_stock > 0 then
      insert into public.inventory_movements(organization_id,item_id,movement_type,quantity,notes)
      values(new.organization_id,new.id,'entry',new.current_stock,'Estoque inicial');
    end if;
    return new;
  end if;
  difference := new.current_stock - old.current_stock;
  if difference <> 0 then
    insert into public.inventory_movements(organization_id,item_id,movement_type,quantity,notes)
    values(new.organization_id,new.id,case when difference > 0 then 'entry' else 'exit' end,abs(difference),'Ajuste pelo cadastro do item');
  end if;
  return new;
end;
$$;
create trigger inventory_track_initial after insert on public.inventory_items for each row execute procedure public.track_inventory_adjustment();
create trigger inventory_track_change after update of current_stock on public.inventory_items for each row execute procedure public.track_inventory_adjustment();

create or replace function public.accept_my_invites()
returns integer language plpgsql security definer set search_path = '' as $$
declare accepted_count integer;
begin
  if auth.uid() is null then return 0; end if;
  insert into public.memberships(organization_id, user_id, role, status)
  select organization_id, auth.uid(), role, 'active'
  from public.team_invites
  where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and status = 'pending'
  on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active';
  get diagnostics accepted_count = row_count;
  update public.team_invites set status = 'accepted', accepted_at = now()
  where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and status = 'pending';
  return accepted_count;
end;
$$;

create or replace function public.can_operate_org(org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where organization_id = org_id and user_id = auth.uid() and status = 'active' and role in ('owner','admin','manager','staff','vet'));
$$;

create or replace function public.can_finance_org(org_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships where organization_id = org_id and user_id = auth.uid() and status = 'active' and role in ('owner','admin','manager','finance'));
$$;

alter table public.facilities enable row level security;
alter table public.facility_occupancies enable row level security;
alter table public.health_records enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.tasks enable row level security;
alter table public.financial_entries enable row level security;
alter table public.team_invites enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['facilities','facility_occupancies','health_records','inventory_items','inventory_movements','tasks','financial_entries','team_invites']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id) or public.is_platform_admin())', table_name || '_member_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_manage_org(organization_id) or public.is_platform_admin())', table_name || '_manager_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_manage_org(organization_id) or public.is_platform_admin()) with check (public.can_manage_org(organization_id) or public.is_platform_admin())', table_name || '_manager_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_manage_org(organization_id) or public.is_platform_admin())', table_name || '_manager_delete', table_name);
  end loop;
end $$;

do $$
declare table_name text;
begin
  foreach table_name in array array['facilities','facility_occupancies','health_records','inventory_items','inventory_movements','tasks']
  loop
    execute format('drop policy %I on public.%I', table_name || '_manager_insert', table_name);
    execute format('drop policy %I on public.%I', table_name || '_manager_update', table_name);
    execute format('drop policy %I on public.%I', table_name || '_manager_delete', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_operate_org(organization_id) or public.is_platform_admin())', table_name || '_operator_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_operate_org(organization_id) or public.is_platform_admin()) with check (public.can_operate_org(organization_id) or public.is_platform_admin())', table_name || '_operator_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_operate_org(organization_id) or public.is_platform_admin())', table_name || '_operator_delete', table_name);
  end loop;
end $$;

drop policy financial_entries_manager_insert on public.financial_entries;
drop policy financial_entries_manager_update on public.financial_entries;
drop policy financial_entries_manager_delete on public.financial_entries;
create policy financial_entries_finance_insert on public.financial_entries for insert to authenticated with check (public.can_finance_org(organization_id) or public.is_platform_admin());
create policy financial_entries_finance_update on public.financial_entries for update to authenticated using (public.can_finance_org(organization_id) or public.is_platform_admin()) with check (public.can_finance_org(organization_id) or public.is_platform_admin());
create policy financial_entries_finance_delete on public.financial_entries for delete to authenticated using (public.can_finance_org(organization_id) or public.is_platform_admin());

create policy profiles_shared_org_select on public.profiles for select to authenticated
using (exists(select 1 from public.memberships m where m.user_id = profiles.id and public.is_org_member(m.organization_id)));

grant select, insert, update, delete on public.facilities, public.facility_occupancies, public.health_records, public.inventory_items, public.inventory_movements, public.tasks, public.financial_entries, public.team_invites to authenticated;
revoke all on function public.accept_my_invites() from public;
grant execute on function public.accept_my_invites() to authenticated;
revoke all on function public.can_operate_org(uuid) from public;
revoke all on function public.can_finance_org(uuid) from public;
grant execute on function public.can_operate_org(uuid), public.can_finance_org(uuid) to authenticated;
