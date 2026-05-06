alter table public.theaters
add column if not exists timezone text not null default 'UTC';
