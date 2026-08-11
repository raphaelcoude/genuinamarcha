alter table public.organizations add column if not exists logo_path text;

create policy organizations_manager_update
on public.organizations for update to authenticated
using (public.can_manage_org(id) or public.is_platform_admin())
with check (public.can_manage_org(id) or public.is_platform_admin());

grant update on public.organizations to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-logos',
  'organization-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy organization_logos_public_read
on storage.objects for select
using (bucket_id = 'organization-logos');

create policy organization_logos_manager_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'organization-logos'
  and public.can_manage_org(((storage.foldername(name))[1])::uuid)
);

create policy organization_logos_manager_update
on storage.objects for update to authenticated
using (
  bucket_id = 'organization-logos'
  and public.can_manage_org(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'organization-logos'
  and public.can_manage_org(((storage.foldername(name))[1])::uuid)
);

create policy organization_logos_manager_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'organization-logos'
  and public.can_manage_org(((storage.foldername(name))[1])::uuid)
);
