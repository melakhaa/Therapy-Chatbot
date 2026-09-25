/* global __dirname */
/* Isolated browser smoke test. Fixtures exist only in Playwright interception.
 * Build with EXPO_PUBLIC_API_URL=http://localhost:8000, then run with
 * PLAYWRIGHT_MODULE pointing to an externally installed playwright package.
 * Does not contact a real backend or modify application data.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const output = process.env.ADMIN_TEST_OUTPUT || path.resolve(__dirname, '../test-results');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (!relative) relative = 'index.html';
  let file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  else if (!path.extname(file)) file += '.html';
  if (!fs.existsSync(file) && relative.startsWith('students/')) file = path.join(root, 'students/[id].html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const adminId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
let role = 'admin';
const student = { user_id: studentId, nama: 'Mahasiswa Uji', email: 'student@example.com', nim: 'TEST001', role: 'mahasiswa', created_at: '2026-09-01T00:00:00Z' };
const profile = () => ({ user_id: adminId, nama: 'Admin Uji', email: 'operator@example.com', role, created_at: '2026-09-01T00:00:00Z' });
let users = [profile(), student];
const assessment = { assessment_id: 'assessment-test', user_id: studentId, nama: student.nama, nim: student.nim, score: 15, severity: 'severe', instrument_type: 'PHQ-9', taken_at: '2026-09-23T09:00:00Z' };
const schedule = { jadwal_id: 'schedule-test', tanggal: '2026-09-24', waktu_mulai: '09:00:00', waktu_selesai: '10:00:00', status: 'dipesan' };
let bookingStatus = 'menunggu';
let empty = false, failure = false, accountsDenied = false, sessionExpired = false;
let created = 0, updated = 0, deleted = 0, scheduled = 0, bookingUpdates = 0;
const requests = [];
let browser, activePage;
async function main() {
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  activePage = page; const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  await page.route('http://localhost:8000/**', async route => {
    const req = route.request(), url = new URL(req.url()), p = url.pathname, method = req.method();
    requests.push({ path: p, method });
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body), headers: { 'Access-Control-Allow-Origin': '*' } });
    if (p === '/auth/login' && req.postDataJSON().password === 'wrong-password') return respond({ detail: 'Invalid credentials' }, 401);
    if (p === '/auth/login') return respond({ access_token: 'synthetic-test-token', refresh_token: '', expires_in: 100, token_type: 'bearer', user: profile() });
    if (p === '/auth/me') return sessionExpired ? respond({ detail: 'expired' }, 401) : respond(profile());
    if (p === '/accounts') {
      if (accountsDenied || role === 'konselor') return respond({ detail: 'denied' }, 403);
      if (method === 'POST') { const body = req.postDataJSON(); users.push({ ...body, password: undefined, user_id: 'test-new', created_at: '2026-09-23T00:00:00Z' }); created++; return respond({ user_id: 'test-new' }, 201); }
      return respond({ users: empty ? [] : users, total: empty ? 0 : users.length });
    }
    if (p.startsWith('/accounts/')) {
      const id = p.split('/').pop();
      if (method === 'PUT') { users = users.map(u => u.user_id === id ? { ...u, ...req.postDataJSON() } : u); updated++; return respond({ message: 'ok' }); }
      if (method === 'DELETE') { users = users.filter(u => u.user_id !== id); deleted++; return respond({ message: 'ok' }); }
    }
    if (p === '/dashboard/data') {
      if (failure) return respond({ detail: 'private SQL exception MUST NOT appear' }, 500);
      return respond({ total_assessments: empty ? 0 : 4, severity_distribution: { minimal: empty ? 0 : 1, mild: empty ? 0 : 1, moderate: empty ? 0 : 1, severe: empty ? 0 : 1 }, weekly_trend: empty ? [] : [{ date: '2026-09-21', count: 1 }, { date: '2026-09-22', count: 2 }, { date: '2026-09-23', count: 1 }], recent_severe: empty ? [] : [assessment], guardrail_trigger_count: empty ? 0 : 1, pending_bookings: empty ? [] : [{ booking_id: 'booking-test', user_id: studentId, created_at: '2026-09-23T00:00:00Z' }] });
    }
    if (p === '/admin/assessments' || p.endsWith('/assessments')) return respond({ assessments: empty ? [] : [{ ...assessment, nama: role === 'konselor' ? null : assessment.nama, nim: role === 'konselor' ? null : assessment.nim }], total: empty ? 0 : 1, page: Number(url.searchParams.get('page') || 1), page_size: 20 });
    if (p.endsWith('/bookings')) return respond({ bookings: empty ? [] : [{ booking_id: 'booking-test', ...schedule, status: bookingStatus }], total: empty ? 0 : 1, page: 1, page_size: 20 });
    if (p.startsWith('/admin/users/')) return respond({ user: student });
    if (p === '/jadwal/saya') return respond({ jadwal: empty ? [] : [schedule] });
    if (p === '/jadwal' && method === 'POST') { scheduled++; return respond({ jadwal: schedule }, 201); }
    if (p === '/booking/masuk') return respond({ bookings: empty ? [] : [{ booking_id: 'booking-test', jadwal_id: schedule.jadwal_id, status: bookingStatus, catatan: 'Catatan sintetis untuk pengujian.', created_at: '2026-09-23T00:00:00Z', jadwal_konsultasi: { ...schedule, konselor_id: adminId } }] });
    if (p.startsWith('/booking/') && method === 'PATCH') { bookingStatus = req.postDataJSON().status; bookingUpdates++; return respond({ message: 'ok' }); }
    return respond({ detail: 'Unexpected test request: ' + p }, 500);
  });
  const visible = async text => { await page.getByText(text, { exact: true }).first().waitFor({ state: 'visible' }); };
  const nav = async name => { await page.getByRole('link', { name, exact: true }).click(); };
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email', { exact: true }).fill('operator@example.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Masuk ke dashboard', exact: true }).click();
  await visible('Email atau kata sandi salah.');
  await page.getByLabel('Kata sandi', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Masuk ke dashboard', exact: true }).click();
  await visible('Selamat datang, Admin');
  await visible('Mahasiswa Uji');
  await page.screenshot({ path: path.join(output, 'overview-desktop-test-fixtures.png'), fullPage: true });
  console.log('PASS login + overview data');
  for (const entry of ['/(dashboard)', '/overview']) {
    await page.goto('http://127.0.0.1:4173' + entry);
    await visible('Selamat datang, Admin');
    await page.reload();
    await visible('Selamat datang, Admin');
  }
  console.log('PASS legacy entry + direct overview + refresh');

  await nav('Risk Monitoring'); await visible('PHQ-9');
  await page.getByRole('button', { name: 'Keparahan tercatat: Semua', exact: true }).click();
  await page.getByLabel('Dari (YYYY-MM-DD)', { exact: true }).fill('bad');
  await page.getByRole('button', { name: 'Terapkan', exact: true }).click();
  await visible('Gunakan tanggal YYYY-MM-DD dengan rentang yang valid.');
  await page.getByLabel('Dari (YYYY-MM-DD)', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Terapkan', exact: true }).click();
  await page.getByRole('button', { name: 'Tinjau', exact: true }).click();
  await visible('Student Detail / Case Review');
  await page.reload();
  await visible('Student Detail / Case Review');
  await page.getByRole('button', { name: 'Bagian: Asesmen', exact: true }).click(); await visible('PHQ-9');
  await page.getByRole('button', { name: 'Bagian: Riwayat konseling', exact: true }).click(); await visible('menunggu');
  console.log('PASS risk filters + detail + histories');

  await nav('Students'); await visible('student@example.com');
  await page.getByLabel('Cari nama, email, atau NIM…', { exact: true }).fill('no-match');
  await visible('Tidak ada pengguna yang sesuai dengan filter.');
  await nav('Analytics'); await visible('Asesmen mingguan');
  await nav('Settings'); await visible('Profil akun');
  console.log('PASS directory search + analytics + settings');

  await nav('User Management');
  await page.getByRole('button', { name: 'Tambah akun', exact: true }).click();
  await page.getByLabel('Nama', { exact: true }).fill('Akun Uji Baru');
  await page.getByLabel('Email', { exact: true }).fill('new@example.com');
  await page.getByLabel('Kata sandi awal', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await visible('Akun berhasil disimpan.'); assert.equal(created, 1);
  await page.getByRole('button', { name: 'Edit', exact: true }).last().click();
  await page.getByLabel('Nama', { exact: true }).fill('Akun Uji Diubah');
  await page.getByRole('button', { name: 'Simpan akun', exact: true }).click();
  await visible('Akun Uji Diubah'); assert.equal(updated, 1);
  await page.getByRole('button', { name: 'Hapus', exact: true }).last().click();
  await visible('Hapus akun?'); assert.equal(deleted, 0);
  await page.getByRole('button', { name: 'Ya, hapus akun', exact: true }).click();
  await visible('Akun berhasil dihapus.'); assert.equal(deleted, 1);
  console.log('PASS create + edit + confirmed delete');

  await nav('Counseling');
  await page.getByRole('button', { name: 'Tambah jadwal', exact: true }).click();
  await page.getByLabel('Tanggal (YYYY-MM-DD)', { exact: true }).fill('2026-09-25');
  await page.getByLabel('Mulai (HH:MM)', { exact: true }).fill('09:00');
  await page.getByLabel('Selesai (HH:MM)', { exact: true }).fill('10:00');
  await page.getByRole('button', { name: 'Simpan jadwal', exact: true }).click();
  await visible('Jadwal berhasil dibuat.'); assert.equal(scheduled, 1);
  await page.getByRole('button', { name: 'Detail', exact: true }).click();
  await visible('Catatan sintetis untuk pengujian.');
  await page.getByRole('button', { name: 'Konfirmasi', exact: true }).click();
  assert.equal(bookingUpdates, 0);
  await page.getByRole('button', { name: 'Ya, ubah status', exact: true }).click();
  await visible('Status booking berhasil diperbarui.'); assert.equal(bookingStatus, 'dikonfirmasi');
  await page.getByRole('button', { name: 'Detail', exact: true }).click();
  await page.getByRole('button', { name: 'Tandai selesai', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, ubah status', exact: true }).click();
  await visible('selesai'); assert.equal(bookingStatus, 'selesai');
  bookingStatus = 'menunggu';
  await page.getByRole('button', { name: 'Perbarui', exact: true }).click();
  await visible('menunggu');
  await page.getByRole('button', { name: 'Detail', exact: true }).click();
  await page.getByRole('button', { name: 'Batalkan booking', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, ubah status', exact: true }).click();
  await visible('dibatalkan'); assert.equal(bookingStatus, 'dibatalkan');
  console.log('PASS schedule + confirm + complete + cancel');

  accountsDenied = true;
  await nav('User Management'); await visible('Akses tidak diizinkan untuk peran Anda.');
  accountsDenied = false; failure = true;
  await nav('Overview'); await visible('Layanan belum tersedia. Silakan coba lagi.');
  assert.equal(await page.getByText('private SQL exception MUST NOT appear').count(), 0);
  failure = false; empty = true;
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await visible('Belum ada hasil asesmen.');
  empty = false;
  await page.getByRole('button', { name: 'Perbarui', exact: true }).click();
  await visible('Mahasiswa Uji');
  console.log('PASS authorization + API error + retry + empty states');

  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await nav('Overview');
    await visible('Selamat datang, Admin');
    await page.waitForTimeout(300);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert(dimensions.scroll <= dimensions.viewport + 1, JSON.stringify(dimensions));
    await page.screenshot({ path: path.join(output, 'overview-' + width + '-test-fixtures.png'), fullPage: true });
    await page.getByText('Distribusi tingkat keparahan', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'charts-' + width + '-test-fixtures.png'), fullPage: true });
    await page.getByRole('button', { name: 'Menu', exact: true }).click(); await nav('Risk Monitoring');
    await visible('PHQ-9');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await page.setViewportSize({ width: 390, height: 568 });
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Tutup navigasi', exact: true }).first().click();
  console.log('PASS tablet + small-screen drawer + short-screen scrolling + no page overflow');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  await visible('Selamat datang kembali');
  assert.equal(await page.evaluate(() => localStorage.getItem('sanctuary_token')), null);
  role = 'konselor';
  await page.getByLabel('Email', { exact: true }).fill('counselor@example.com');
  await page.getByLabel('Kata sandi', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Masuk ke dashboard', exact: true }).click();
  await visible('Email atau kata sandi salah.');
  await page.getByLabel('Kata sandi', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Masuk ke dashboard', exact: true }).click();
  await visible('Selamat datang, Admin');
  const before = requests.filter(r => r.path === '/accounts').length;
  await nav('User Management');
  await visible('Direktori akun hanya tersedia untuk admin dan pemangku jabatan. Konselor dapat meninjau hasil asesmen melalui Risk Monitoring sesuai izin yang ada.');
  assert.equal(requests.filter(r => r.path === '/accounts').length, before);
  await nav('Risk Monitoring'); await visible('Identitas dibatasi');
  await page.getByRole('button', { name: 'Tinjau', exact: true }).click();
  await visible('Identitas dibatasi');
  console.log('PASS logout + counselor restrictions');
  sessionExpired = true;
  await page.reload(); await visible('Sesi berakhir. Silakan keluar dan masuk kembali.');
  console.log('PASS expired session');
  assert.deepEqual(pageErrors, []);
  fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ status: 'passed', browserErrors: pageErrors, fixturesOnly: true, created, updated, deleted, scheduled, bookingUpdates }, null, 2));
  console.log('ALL BROWSER CHECKS PASSED');
}
main().catch(async e => { console.error(e); console.log('Requests:', JSON.stringify(requests)); if (activePage) { console.log((await activePage.locator('body').innerText()).slice(0, 5000)); await activePage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); } process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
