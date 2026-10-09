import assert from 'node:assert/strict';
import test from 'node:test';
import { PREVIEW_ADMIN, resolvePreviewMode } from './previewMode.ts';

test('preview mode is enabled only by the explicit development flag', () => {
  assert.equal(resolvePreviewMode('development', 'true'), true);
  assert.equal(resolvePreviewMode('development', 'false'), false);
  assert.equal(resolvePreviewMode('development', undefined), false);
});

test('production ignores the preview flag', () => {
  assert.equal(resolvePreviewMode('production', 'true'), false);
  assert.equal(resolvePreviewMode('test', 'true'), false);
});

test('preview identity is an obviously local administrator', () => {
  assert.deepEqual(PREVIEW_ADMIN, {
    user_id: 'preview-admin-local',
    name: 'Preview Administrator',
    email: 'preview@sajiwa.local',
    role: 'admin',
  });
});
