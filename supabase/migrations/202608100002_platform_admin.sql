create type public.subscription_status as enum ('trial','active','past_due','cancelled');

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_cents integer not null default 0 check (price_cents >= 0),
  max_users integer,
  max_horses integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.platform_admins where user_id = auth.uid());
$$;

alter table public.platform_admins enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;

create policy platform_admins_self_select on public.platform_admins for select using (user_id = auth.uid());
create policy plans_authenticated_select on public.plans for select to authenticated using (active or public.is_platform_admin());
create policy plans_platform_manage on public.plans for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy subscriptions_org_select on public.subscriptions for select to authenticated using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy subscriptions_platform_manage on public.subscriptions for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy organizations_platform_select on public.organizations for select to authenticated using (public.is_platform_admin());
create policy memberships_platform_select on public.memberships for select to authenticated using (public.is_platform_admin());
create policy horses_platform_select on public.horses for select to authenticated using (public.is_platform_admin());
create policy profiles_platform_select on public.profiles for select to authenticated using (public.is_platform_admin());

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.plans, public.subscriptions to authenticated;

insert into public.plans(name, price_cents, max_users, max_horses) values
  ('Essencial', 14900, 3, 30),
  ('Profissional', 29900, 10, 150),
  ('Premium', 49900, null, null)
on conflict (name) do nothing;

insert into public.platform_admins(user_id)
values ('9d620c72-4a1f-467a-a6b7-dc08c088d81d')
on conflict (user_id) do nothing;
