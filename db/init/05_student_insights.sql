-- Aggregate activity from the student app for the staff dashboard (GET /admin/insights).
-- Privacy by construction: only counts leave this function. No journal text, chat text,
-- names or ids. RLS keeps staff out of journals/chat_sessions, so it runs as SECURITY
-- DEFINER and checks the caller's role itself (non-staff get NULL).
create or replace function student_insights(p_days int default 30)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with win as (select now() - make_interval(days => greatest(1, least(p_days, 365))) as since)
  select case when current_user_role() in ('konselor', 'admin', 'pemangku_jabatan') then jsonb_build_object(
    'days', greatest(1, least(p_days, 365)),
    'students_total', (select count(*) from users where role = 'mahasiswa'),
    'students_new', (select count(*) from users, win where role = 'mahasiswa' and created_at >= win.since),
    'students_active', (
      select count(distinct uid) from win, lateral (
        select j.user_id as uid from journals j where j.created_at >= win.since
        union select c.user_id from chat_sessions c where c.started_at >= win.since
        union select b.user_id from booking_konsultasi b where b.created_at >= win.since
      ) a
    ),
    'journals_total', (select count(*) from journals, win where created_at >= win.since and content not like 'Check-in cepat:%'),
    'checkins_total', (select count(*) from journals, win where created_at >= win.since and content like 'Check-in cepat:%'),
    'chat_sessions_total', (select count(*) from chat_sessions, win where started_at >= win.since),
    'mood_distribution', (
      select coalesce(jsonb_object_agg(mood, c), '{}'::jsonb) from (
        select mood, count(*) as c from journals, win
        where mood is not null and created_at >= win.since group by mood
      ) m
    ),
    'mood_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'mood', mood, 'count', c) order by d, mood), '[]'::jsonb) from (
        select created_at::date as d, mood, count(*) as c from journals, win
        where mood is not null and created_at >= win.since group by 1, 2
      ) x
    ),
    'chat_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', c) order by d), '[]'::jsonb) from (
        select started_at::date as d, count(*) as c from chat_sessions, win
        where started_at >= win.since group by 1
      ) x
    )
  ) end
  from win;
$$;

grant execute on function student_insights(int) to sanctuary_app;
