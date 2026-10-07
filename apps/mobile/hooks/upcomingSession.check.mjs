// Self-check for nearestSession. No test runner needed:
//
//   cd apps/mobile
//   node --experimental-strip-types hooks/upcomingSession.check.mjs
import assert from 'node:assert/strict';
import { nearestSession } from './upcomingSession.ts';

const NOW = Date.parse('2026-10-06T00:30:00Z'); // 07.30 WIB, Selasa
const at = (hoursFromNow) => new Date(NOW + hoursFromNow * 3_600_000).toISOString();
const request = (over) => ({
  counseling_request_id: Math.random().toString(36).slice(2), status: 'requested', preferred_context: null,
  created_at: at(-48), preferred_counselor_id: 'k1', preferred_counselor_name: 'Bu Sari',
  preferred_starts_at: null, preferred_ends_at: null, appointment_id: null, counselor_id: null,
  counselor_name: null, starts_at: null, ends_at: null, appointment_status: null, ...over,
});
const pick = (h) => request({ preferred_starts_at: at(h), preferred_ends_at: at(h + 1) });
const booked = (h, appointment_status = 'confirmed', counselor_name = 'Pak Budi') =>
  request({ status: appointment_status, preferred_starts_at: at(h + 5), preferred_ends_at: at(h + 6),
            appointment_id: 'a1', counselor_id: 'k2', counselor_name, starts_at: at(h), ends_at: at(h + 1), appointment_status });

assert.equal(nearestSession([], NOW), undefined, 'nothing booked');

// A pick waiting for an admin shows at the picked time, with the picked counselor.
assert.deepEqual(nearestSession([pick(3)], NOW),
  { start: at(3), end: at(4), counselor: 'Bu Sari', status: 'menunggu' });

// Once assigned, the appointment wins over the pick: time and counselor may both have moved.
assert.deepEqual(nearestSession([booked(2)], NOW),
  { start: at(2), end: at(3), counselor: 'Pak Budi', status: 'dikonfirmasi' });
assert.equal(nearestSession([booked(2, 'rescheduled')], NOW).status, 'dikonfirmasi');

// Closed outcomes never show as "next".
for (const s of ['cancelled', 'completed', 'no_show']) {
  assert.equal(nearestSession([booked(2, s)], NOW), undefined, s);
}

// Nearest first, regardless of list order.
assert.equal(nearestSession([pick(30), booked(5), pick(2)], NOW).start, at(2));

// Still "next" while it is happening; gone once it has ended.
assert.equal(nearestSession([pick(-0.5)], NOW).start, at(-0.5), 'in progress');
assert.equal(nearestSession([pick(-2)], NOW), undefined, 'ended an hour ago');

// The bug this replaces: yesterday-by-UTC is today in WIB. A session ending at 06.00 WIB
// today has passed at 07.30 WIB, whatever the UTC date says.
assert.equal(nearestSession([pick(-2.5)], NOW), undefined);

// A request with no pick (sent without choosing a time) has nothing to show yet.
assert.equal(nearestSession([request({})], NOW), undefined);

console.log('upcomingSession ok');
