








create extension if not exists vector;
create extension if not exists pgcrypto;







create table if not exists users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  nama        varchar(100)  not null,
  email       varchar(100)  not null unique,
  nim         varchar(14),                          
  role        varchar(20)   not null default 'mahasiswa'
                check (role in ('mahasiswa', 'konselor', 'admin', 'pemangku_jabatan')),
  created_at  timestamptz   default now()
);

alter table users enable row level security;

create policy "users_read_own"          on users for select using (auth.uid() = user_id);
create policy "users_update_own"        on users for update using (auth.uid() = user_id);
create policy "admin_manage_all_users"  on users for all using (
  exists (select 1 from users u where u.user_id = auth.uid() and u.role in ('admin', 'pemangku_jabatan'))
);


create or replace function sync_auth_user_to_users()
returns trigger language plpgsql security definer as $$
begin
  insert into users (user_id, nama, email, nim, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nama', new.email),
    new.email,
    new.raw_user_meta_data ->> 'nim',
    coalesce(new.raw_user_meta_data ->> 'role', 'mahasiswa')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function sync_auth_user_to_users();





create table if not exists assessments (
  assessment_id    uuid         primary key default gen_random_uuid(),
  user_id          uuid         not null references users(user_id) on delete cascade,
  instrument_type  varchar(20)  not null,   
  answers          jsonb        not null,   
  score            int          not null,
  severity         varchar(20)  not null,   
  taken_at         timestamptz  default now()
);

create index if not exists idx_assessments_user_id   on assessments(user_id);
create index if not exists idx_assessments_severity  on assessments(severity);
create index if not exists idx_assessments_taken_at  on assessments(taken_at desc);

alter table assessments enable row level security;

create policy "mahasiswa_own_assessments" on assessments
  for all using (auth.uid() = user_id);

create policy "konselor_admin_read_assessments" on assessments
  for select using (
    exists (select 1 from users u where u.user_id = auth.uid()
            and u.role in ('konselor', 'admin', 'pemangku_jabatan'))
  );






create table if not exists jadwal_konsultasi (
  jadwal_id     uuid        primary key default gen_random_uuid(),
  konselor_id   uuid        not null references users(user_id) on delete cascade,
  tanggal       date        not null,
  waktu_mulai   time        not null,
  waktu_selesai time        not null,
  status        varchar(20) not null default 'tersedia'
                  check (status in ('tersedia', 'dipesan', 'selesai', 'dibatalkan')),
  created_at    timestamptz default now(),

  constraint jadwal_time_valid check (waktu_selesai > waktu_mulai)
);

create index if not exists idx_jadwal_konselor_id on jadwal_konsultasi(konselor_id);
create index if not exists idx_jadwal_tanggal     on jadwal_konsultasi(tanggal);
create index if not exists idx_jadwal_status      on jadwal_konsultasi(status);

alter table jadwal_konsultasi enable row level security;

create policy "konselor_manage_own_jadwal" on jadwal_konsultasi
  for all using (auth.uid() = konselor_id);

create policy "admin_manage_all_jadwal" on jadwal_konsultasi
  for all using (
    exists (select 1 from users u where u.user_id = auth.uid()
            and u.role in ('admin', 'pemangku_jabatan'))
  );

create policy "mahasiswa_view_tersedia_jadwal" on jadwal_konsultasi
  for select using (status = 'tersedia');






create table if not exists booking_konsultasi (
  booking_id  uuid        primary key default gen_random_uuid(),
  jadwal_id   uuid        not null references jadwal_konsultasi(jadwal_id) on delete restrict,
  user_id     uuid        not null references users(user_id) on delete cascade,
  status      varchar(20) not null default 'menunggu'
                check (status in ('menunggu', 'dikonfirmasi', 'selesai', 'dibatalkan')),
  catatan     text,
  created_at  timestamptz default now()
);

create index if not exists idx_booking_jadwal_id on booking_konsultasi(jadwal_id);
create index if not exists idx_booking_user_id   on booking_konsultasi(user_id);
create index if not exists idx_booking_status    on booking_konsultasi(status);

alter table booking_konsultasi enable row level security;

create policy "mahasiswa_own_booking" on booking_konsultasi
  for all using (auth.uid() = user_id);

create policy "konselor_view_booking" on booking_konsultasi
  for select using (
    exists (
      select 1 from jadwal_konsultasi j
      where j.jadwal_id = booking_konsultasi.jadwal_id
        and j.konselor_id = auth.uid()
    )
  );

create policy "konselor_update_booking" on booking_konsultasi
  for update using (
    exists (
      select 1 from jadwal_konsultasi j
      where j.jadwal_id = booking_konsultasi.jadwal_id
        and j.konselor_id = auth.uid()
    )
  );

create policy "admin_manage_all_booking" on booking_konsultasi
  for all using (
    exists (select 1 from users u where u.user_id = auth.uid()
            and u.role in ('admin', 'pemangku_jabatan'))
  );


create or replace function mark_jadwal_dipesan()
returns trigger language plpgsql as $$
begin
  update jadwal_konsultasi set status = 'dipesan' where jadwal_id = new.jadwal_id;
  return new;
end;
$$;

drop trigger if exists booking_mark_jadwal on booking_konsultasi;
create trigger booking_mark_jadwal
  after insert on booking_konsultasi
  for each row execute function mark_jadwal_dipesan();


create or replace function restore_jadwal_on_cancel()
returns trigger language plpgsql as $$
begin
  if new.status = 'dibatalkan' and old.status != 'dibatalkan' then
    update jadwal_konsultasi set status = 'tersedia' where jadwal_id = new.jadwal_id;
  end if;
  return new;
end;
$$;

drop trigger if exists booking_restore_jadwal on booking_konsultasi;
create trigger booking_restore_jadwal
  after update on booking_konsultasi
  for each row execute function restore_jadwal_on_cancel();





create table if not exists hotline (
  hotline_id  uuid         primary key default gen_random_uuid(),
  nama        varchar(100) not null,
  nomor       varchar(20)  not null,
  deskripsi   text,
  created_at  timestamptz  default now()
);

alter table hotline enable row level security;

create policy "public_read_hotline"   on hotline for select using (true);
create policy "admin_manage_hotline"  on hotline for all using (
  exists (select 1 from users u where u.user_id = auth.uid() and u.role = 'admin')
);


insert into hotline (nama, nomor, deskripsi) values
  ('Into The Light Indonesia', '119 ext 8',      'Layanan crisis center nasional'),
  ('Yayasan Pulih',            '(021) 788-42580', 'Konseling psikologis'),
  ('IGD Rumah Sakit Terdekat', '118',             'Unit gawat darurat')
on conflict do nothing;







alter table chat_sessions
  drop constraint if exists chat_sessions_user_id_fkey;
alter table chat_sessions
  add constraint chat_sessions_user_id_fkey
    foreign key (user_id) references users(user_id) on delete cascade
    not valid;



alter table messages
  drop constraint if exists messages_session_id_fkey;
alter table messages
  add constraint messages_session_id_fkey
    foreign key (session_id) references chat_sessions(session_id) on delete cascade
    not valid;


alter table guardrail_logs
  drop constraint if exists guardrail_logs_session_id_fkey;
alter table guardrail_logs
  add constraint guardrail_logs_session_id_fkey
    foreign key (session_id) references chat_sessions(session_id) on delete cascade
    not valid;


alter table chat_sessions  add column if not exists title     text;
alter table messages       add column if not exists user_id   uuid references users(user_id) on delete set null;






create table if not exists journals (
  journal_id  uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users(user_id) on delete cascade,
  content     text        not null,
  mood        varchar(20),           
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_journals_user_id    on journals(user_id);
create index if not exists idx_journals_created_at on journals(created_at desc);

alter table journals enable row level security;

create policy "mahasiswa_own_journals" on journals
  for all using (auth.uid() = user_id);

create trigger journals_updated_at
  before update on journals
  for each row execute function set_updated_at();





drop function if exists match_documents(vector, double precision, integer);

create or replace function match_documents(
  query_embedding vector(768),
  match_threshold float default 0.3,
  match_count     int   default 5
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable as $$
  select
    document_id as id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
