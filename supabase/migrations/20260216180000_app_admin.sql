-- Añadir campo de administrador a profiles
alter table public.profiles
  add column if not exists is_app_admin boolean default false;

comment on column public.profiles.is_app_admin is 'Usuario administrador de la aplicación';

-- Crear índice para búsquedas rápidas de admins
create index if not exists idx_profiles_app_admin on public.profiles(is_app_admin) where is_app_admin = true;

-- Tabla de emails de administradores (para añadir nuevos admins fácilmente)
create table if not exists public.admin_emails (
  email text primary key,
  added_at timestamptz default now(),
  added_by text
);

comment on table public.admin_emails is 'Lista de emails que serán administradores automáticamente al registrarse';

-- Insertar el admin principal
insert into public.admin_emails (email, added_by)
values ('pelagosapp@gmail.com', 'sistema')
on conflict (email) do nothing;

-- RLS para admin_emails (solo admins pueden ver/modificar)
alter table public.admin_emails enable row level security;

create policy if not exists "Solo admins ven emails admin" on public.admin_emails
  for select using (public.is_current_user_admin());

create policy if not exists "Solo admins insertan emails admin" on public.admin_emails
  for insert with check (public.is_current_user_admin());

create policy if not exists "Solo admins eliminan emails admin" on public.admin_emails
  for delete using (public.is_current_user_admin());

-- Función para verificar si el usuario actual es admin
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (select is_app_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Función que verifica si un email está en la lista de admins
create or replace function public.is_admin_email(check_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists(select 1 from public.admin_emails where email = lower(check_email));
$$;

-- Función para establecer admin automáticamente al crear perfil
create or replace function public.set_admin_on_profile_create()
returns trigger
language plpgsql
security definer
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = NEW.id;
  
  if public.is_admin_email(user_email) then
    NEW.is_app_admin := true;
  end if;
  
  return NEW;
end;
$$;

-- Trigger para nuevos perfiles (solo si no existe)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_profile_created_set_admin'
  ) then
    create trigger on_profile_created_set_admin
      before insert on public.profiles
      for each row
      execute function public.set_admin_on_profile_create();
  end if;
end;
$$;

-- Actualizar usuarios existentes que estén en la lista de admin_emails
update public.profiles p
set is_app_admin = true
where exists (
  select 1 from auth.users u
  join public.admin_emails ae on lower(u.email) = lower(ae.email)
  where u.id = p.id
)
and p.is_app_admin is not true;
