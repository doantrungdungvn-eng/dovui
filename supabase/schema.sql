-- Đố Vui Online Miễn Phí schema. Run the whole script in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.quiz_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null default 'Đố Vui Online Miễn Phí',
  status text not null default 'lobby' check (status in ('lobby','question','reveal','finished')),
  current_question integer not null default 0,
  question_started_at timestamptz,
  question_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.quiz_rooms(id) on delete cascade,
  question_index integer not null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
  correct_index integer not null check (correct_index between 0 and 3),
  seconds integer not null default 15 check (seconds between 5 and 120),
  points integer not null default 1000 check (points between 100 and 5000),
  created_at timestamptz not null default now(),
  unique(room_id, question_index)
);

create table if not exists public.quiz_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.quiz_rooms(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  total_score integer not null default 0,
  correct_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.quiz_rooms(id) on delete cascade,
  player_id uuid not null references public.quiz_players(id) on delete cascade,
  question_index integer not null,
  selected_index integer not null check (selected_index between 0 and 3),
  is_correct boolean not null,
  score_awarded integer not null default 0,
  elapsed_ms integer not null default 0,
  created_at timestamptz not null default now(),
  unique(room_id, player_id, question_index)
);

create index if not exists quiz_players_room_score_idx on public.quiz_players(room_id, total_score desc);
create index if not exists quiz_answers_room_question_idx on public.quiz_answers(room_id, question_index);

alter table public.quiz_rooms enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_players enable row level security;
alter table public.quiz_answers enable row level security;

-- Public live event MVP policies. For production, add Supabase Auth/admin ownership
-- and move answer submission/host actions behind trusted server routes.
drop policy if exists "rooms readable" on public.quiz_rooms;
create policy "rooms readable" on public.quiz_rooms for select to anon, authenticated using (true);
drop policy if exists "rooms create" on public.quiz_rooms;
create policy "rooms create" on public.quiz_rooms for insert to anon, authenticated with check (true);
drop policy if exists "rooms host update" on public.quiz_rooms;
create policy "rooms host update" on public.quiz_rooms for update to anon, authenticated using (true) with check (true);

drop policy if exists "questions readable" on public.quiz_questions;
create policy "questions readable" on public.quiz_questions for select to anon, authenticated using (true);
drop policy if exists "questions create" on public.quiz_questions;
create policy "questions create" on public.quiz_questions for insert to anon, authenticated with check (true);
drop policy if exists "questions delete" on public.quiz_questions;
create policy "questions delete" on public.quiz_questions for delete to anon, authenticated using (true);

drop policy if exists "players readable" on public.quiz_players;
create policy "players readable" on public.quiz_players for select to anon, authenticated using (true);
drop policy if exists "players join" on public.quiz_players;
create policy "players join" on public.quiz_players for insert to anon, authenticated with check (true);
drop policy if exists "players score update" on public.quiz_players;
create policy "players score update" on public.quiz_players for update to anon, authenticated using (true) with check (true);

drop policy if exists "answers readable" on public.quiz_answers;
create policy "answers readable" on public.quiz_answers for select to anon, authenticated using (true);

-- Atomic submission: unique key prevents a second answer for the same player/question.
-- Client-side submitted score is clamped to question points and verified against answer key.
create or replace function public.submit_quiz_answer(
  p_room_id uuid,
  p_player_id uuid,
  p_question_index integer,
  p_selected_index integer,
  p_score integer,
  p_is_correct boolean,
  p_elapsed_ms integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.quiz_questions%rowtype;
  r public.quiz_rooms%rowtype;
  actual_correct boolean;
  actual_score integer;
  inserted_id uuid;
begin
  select * into r from public.quiz_rooms where id=p_room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if r.status <> 'question' or r.current_question <> p_question_index then
    raise exception 'Question is not accepting answers';
  end if;
  if r.question_ends_at is null or now() > r.question_ends_at then
    raise exception 'Time is up';
  end if;
  select * into q from public.quiz_questions
    where room_id=p_room_id and question_index=p_question_index;
  if not found then raise exception 'Question not found'; end if;
  if not exists(select 1 from public.quiz_players where id=p_player_id and room_id=p_room_id) then
    raise exception 'Player not in room';
  end if;
  actual_correct := (p_selected_index=q.correct_index);
  actual_score := case when actual_correct
    then greatest(0, least(q.points, p_score))
    else 0 end;
  insert into public.quiz_answers(room_id,player_id,question_index,selected_index,is_correct,score_awarded,elapsed_ms)
  values(p_room_id,p_player_id,p_question_index,p_selected_index,actual_correct,actual_score,greatest(0,p_elapsed_ms))
  on conflict(room_id,player_id,question_index) do nothing
  returning id into inserted_id;
  if inserted_id is null then raise exception 'You have already answered this question'; end if;
  update public.quiz_players
    set total_score=total_score+actual_score,
        correct_count=correct_count+case when actual_correct then 1 else 0 end
    where id=p_player_id;
  return jsonb_build_object('accepted',true,'correct',actual_correct,'score',actual_score);
end;
$$;

-- Enable realtime publication for shared room/player/answer updates.
do $$ begin
  alter publication supabase_realtime add table public.quiz_rooms;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.quiz_players;
exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.quiz_answers;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Reusable topic/question groups managed from the admin page.
create table if not exists public.quiz_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  code_prefix text not null check (code_prefix ~ '^[A-Z0-9]{2,5}$'),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions)='array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists quiz_topics_code_prefix_idx on public.quiz_topics(code_prefix);
alter table public.quiz_topics enable row level security;
drop policy if exists "topics readable" on public.quiz_topics;
create policy "topics readable" on public.quiz_topics for select to anon, authenticated using (true);
drop policy if exists "topics create" on public.quiz_topics;
create policy "topics create" on public.quiz_topics for insert to anon, authenticated with check (true);
drop policy if exists "topics update" on public.quiz_topics;
create policy "topics update" on public.quiz_topics for update to anon, authenticated using (true) with check (true);
drop policy if exists "topics delete" on public.quiz_topics;
create policy "topics delete" on public.quiz_topics for delete to anon, authenticated using (true);
