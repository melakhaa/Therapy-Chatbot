import assert from 'node:assert/strict';
import test from 'node:test';
import { previewDatasetSummary, previewRequest } from './previewData.ts';

test('preview dataset covers each dashboard domain', () => {
  assert.deepEqual(previewDatasetSummary(), {
    students: 4,
    faculties: 3,
    units: 4,
    counselors: 3,
    resources: 3,
    instruments: 4,
    hotlines: 3,
  });
});

test('preview counseling data carries deterministic resource and exception states', async () => {
  const resources = await previewRequest<{ resources: Array<{ resource_id: string; resource_type: string }> }>('/admin/counseling/resources');
  const calendar = await previewRequest<{ appointments: Array<{ resource_id?: string | null }>; resource_blocks: Array<{ resource_id: string }>; blocked_periods: Array<{ source?: string; review_status?: string }>; resource_authority_complete: boolean }>('/admin/counseling/calendar/multi?date_from=2026-01-01&date_to=2099-01-01');
  assert.deepEqual(resources.resources.map((item) => item.resource_type), ['physical', 'physical', 'virtual']);
  assert.equal(calendar.resource_authority_complete, true);
  assert.ok(calendar.appointments.some((item) => item.resource_id === 'preview-resource-a'));
  assert.ok(calendar.resource_blocks.some((item) => item.resource_id === 'preview-resource-a'));
  assert.ok(calendar.blocked_periods.some((item) => item.source === 'counselor' && item.review_status === 'pending'));
});

test('preview adapter returns synthetic monitoring and academic data', async () => {
  const attention = await previewRequest<{ signals: Array<{ log_id: string }> }>('/admin/attention?page=1&page_size=100');
  const academics = await previewRequest<{ faculties: Array<{ faculty_id: string }> }>('/admin/academic/faculties');
  assert.ok(attention.signals.length >= 3);
  assert.ok(attention.signals.every((row) => row.log_id.startsWith('preview-')));
  assert.ok(academics.faculties.every((row) => row.faculty_id.startsWith('preview-')));
});

test('preview mutations stay in memory and return typed endpoint shapes', async () => {
  const updated = await previewRequest<{ message: string }>('/admin/attention/preview-assessment-signal-01/read', { method: 'PATCH' });
  const rows = await previewRequest<{ signals: Array<{ log_id: string; is_read: boolean }> }>('/admin/attention?page=1&page_size=100');
  assert.match(updated.message, /Preview/);
  assert.equal(rows.signals.find((row) => row.log_id === 'preview-assessment-signal-01')?.is_read, true);
});
