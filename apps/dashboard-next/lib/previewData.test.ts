import assert from 'node:assert/strict';
import test from 'node:test';
import { previewDatasetSummary, previewRequest } from './previewData.ts';

test('preview dataset covers each dashboard domain', () => {
  assert.deepEqual(previewDatasetSummary(), {
    students: 4,
    faculties: 3,
    units: 4,
    counselors: 3,
    instruments: 3,
    hotlines: 3,
  });
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
