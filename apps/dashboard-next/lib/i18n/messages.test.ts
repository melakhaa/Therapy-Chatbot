import assert from 'node:assert/strict';
import test from 'node:test';
import { isLanguage, messages } from './messages.ts';

test('accepts only supported language selections', () => {
  assert.equal(isLanguage('id'), true);
  assert.equal(isLanguage('en'), true);
  assert.equal(isLanguage('fr'), false);
});

test('provides both Indonesian and English shell labels', () => {
  assert.equal(messages.id.nav.overview, 'Beranda Operasional');
  assert.equal(messages.en.nav.overview, 'Operations Overview');
});

test('provides both languages for the M8 instrument workflow', () => {
  assert.equal(messages.id.instruments.actions.save, 'Simpan Draft');
  assert.equal(messages.en.instruments.actions.save, 'Save Draft');
  assert.match(messages.id.instruments.validation.unavailableBody, /Backend/);
  assert.match(messages.en.instruments.validation.unavailableBody, /backend/);
});

test('provides bilingual M10 copy for report, builder, and shell surfaces', () => {
  assert.equal(messages.id.analytics.report.back, 'Kembali ke Analytics');
  assert.equal(messages.en.analytics.report.back, 'Back to Analytics');
  assert.equal(messages.id.instrumentCreate.addDimension, 'Tambah dimensi');
  assert.equal(messages.en.instrumentCreate.addDimension, 'Add dimension');
  assert.equal(messages.id.common.mainNavigation, 'Navigasi utama');
  assert.equal(messages.en.common.mainNavigation, 'Main navigation');
});
