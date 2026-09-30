-- お気に入りのサーバー保存（Googleログインしたユーザー用）。
-- Supabase の SQL Editor で実行する。何度実行しても安全になるよう if not exists / drop policy if exists を使っている。
--
-- 方針:
--  * フロントが supabase-js（anon キー＋ログイン中のトークン）から直接読み書きする。安全性は RLS だけで決まる。
--  * user_recipes: 保存したレシピ本体。将来の「公開」に備えて is_public を持つ（今は常に false）。
--  * favorites   : どのユーザーがどのレシピをお気に入りにしたか。
--  * どちらも auth.users を参照し on delete cascade。退会（ユーザー削除）で自動的に消える。
--  * 薬の警告（warnings）は本人の薬に依存する健康情報なので保存しない。
--  * ユーザーが選んだ写真は容量が大きいため、ここには保存しない（端末内のみ）。

-- ---- テーブル ----

create table if not exists public.user_recipes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users (id) on delete cascade,
  recipe_name   text not null check (char_length(recipe_name) between 1 and 200),
  cooking_time  integer not null check (cooking_time >= 0),
  difficulty    text not null,
  ingredients   jsonb not null check (jsonb_typeof(ingredients) = 'array'),
  steps         jsonb not null check (jsonb_typeof(steps) = 'array'),
  point         text,
  -- 生成画像の公開URL。data URL（巨大）や http/javascript などを入れさせない
  image_url     text check (image_url is null or image_url like 'https://%'),
  is_public     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (owner_id, recipe_name)
);

create table if not exists public.favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  recipe_id   uuid not null references public.user_recipes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create index if not exists favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index if not exists user_recipes_owner_idx on public.user_recipes (owner_id);

-- ---- 権限 ----
-- 未ログイン（anon）は一切触らせない。ログイン済み（authenticated）だけに必要な操作を許可する。
revoke all on public.user_recipes from anon;
revoke all on public.favorites from anon;
grant select, insert, update, delete on public.user_recipes to authenticated;
grant select, insert, delete on public.favorites to authenticated;

-- ---- RLS ----
alter table public.user_recipes enable row level security;
alter table public.favorites enable row level security;

-- user_recipes: 自分のレシピ、または公開されたレシピだけ読める。書き込みは自分のものだけ。
drop policy if exists "user_recipes_select" on public.user_recipes;
create policy "user_recipes_select" on public.user_recipes
  for select to authenticated
  using (owner_id = (select auth.uid()) or is_public);

drop policy if exists "user_recipes_insert" on public.user_recipes;
create policy "user_recipes_insert" on public.user_recipes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "user_recipes_update" on public.user_recipes;
create policy "user_recipes_update" on public.user_recipes
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "user_recipes_delete" on public.user_recipes;
create policy "user_recipes_delete" on public.user_recipes
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- favorites: 自分の分だけ読める。追加できるのは「自分が見られるレシピ」だけ。
drop policy if exists "favorites_select" on public.favorites;
create policy "favorites_select" on public.favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "favorites_insert" on public.favorites;
create policy "favorites_insert" on public.favorites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.user_recipes r
      where r.id = recipe_id and (r.owner_id = (select auth.uid()) or r.is_public)
    )
  );

drop policy if exists "favorites_delete" on public.favorites;
create policy "favorites_delete" on public.favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));
