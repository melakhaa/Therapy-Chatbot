-- Bookings list for the staff dashboard (GET /booking/admin).
-- Staff need the student's name to run a session, but RLS on users only lets a konselor
-- read their own row. This SECURITY DEFINER function scopes by role itself:
--   admin / pemangku_jabatan -> every booking
--   konselor                 -> bookings on their own slots
--   anyone else              -> nothing
create or replace function list_bookings_for_staff()
returns table (
  booking_id uuid, status varchar, catatan text, created_at timestamptz,
  mahasiswa_nama varchar, mahasiswa_nim varchar, mahasiswa_email varchar,
  konselor_nama varchar,
  tanggal date, waktu_mulai time, waktu_selesai time
)
language sql
security definer
set search_path = public
stable
as $$
  select b.booking_id, b.status, b.catatan, b.created_at,
         m.nama, m.nim, m.email,
         k.nama,
         j.tanggal, j.waktu_mulai, j.waktu_selesai
  from booking_konsultasi b
  join jadwal_konsultasi j on j.jadwal_id = b.jadwal_id
  join users m on m.user_id = b.user_id
  join users k on k.user_id = j.konselor_id
  where current_user_role() in ('admin', 'pemangku_jabatan')
     or (current_user_role() = 'konselor' and j.konselor_id = app_user_id())
  order by b.created_at desc;
$$;

grant execute on function list_bookings_for_staff() to sanctuary_app;
