import { encodeBase64 } from './base64';
import {
  InvalidSyncCodeError,
  buildSyncPayload,
  decodeSyncPayload,
  encodeSyncPayload,
} from './codeSync';

describe('buildSyncPayload', () => {
  it('includes only known sync keys with a non-null value', () => {
    const payload = buildSyncPayload({
      'salatibox:quran-progress': '{"bookmarks":[]}',
      'salatibox:hifz-progress': null,
    });
    expect(payload.v).toBe(1);
    expect(payload.data).toEqual({ 'salatibox:quran-progress': '{"bookmarks":[]}' });
    expect(payload.exportedAt).toEqual(expect.any(String));
  });

  it('produces an empty data object when nothing is stored yet', () => {
    expect(buildSyncPayload({}).data).toEqual({});
  });
});

describe('encodeSyncPayload / decodeSyncPayload', () => {
  it('round-trips a payload with multiple domains', () => {
    const payload = buildSyncPayload({
      'salatibox:quran-progress': '{"bookmarks":[{"surah":2,"ayah":255}]}',
      'salatibox:tasbih': '{"count":33}',
    });
    const code = encodeSyncPayload(payload);
    const decoded = decodeSyncPayload(code);
    expect(decoded).toEqual(payload);
  });

  it('throws InvalidSyncCodeError for garbage input', () => {
    expect(() => decodeSyncPayload('not a real code!!')).toThrow(InvalidSyncCodeError);
  });

  it('throws InvalidSyncCodeError for valid base64 that is not a sync payload', () => {
    const unrelatedCode = encodeSyncPayload({ v: 1, exportedAt: '', data: {} });
    const tampered = unrelatedCode.slice(0, -4); // truncate to corrupt the JSON
    expect(() => decodeSyncPayload(tampered)).toThrow(InvalidSyncCodeError);
  });

  it('throws InvalidSyncCodeError when the version field is missing or wrong', () => {
    const code = encodeBase64(JSON.stringify({ v: 2, exportedAt: '', data: {} }));
    expect(() => decodeSyncPayload(code)).toThrow(InvalidSyncCodeError);
  });

  it('throws InvalidSyncCodeError when data is null', () => {
    const code = encodeBase64(JSON.stringify({ v: 1, exportedAt: '', data: null }));
    expect(() => decodeSyncPayload(code)).toThrow(InvalidSyncCodeError);
  });

  it('throws InvalidSyncCodeError when data is an array instead of an object', () => {
    const code = encodeBase64(JSON.stringify({ v: 1, exportedAt: '', data: [] }));
    expect(() => decodeSyncPayload(code)).toThrow(InvalidSyncCodeError);
  });

  it('trims surrounding whitespace from a pasted code', () => {
    const payload = buildSyncPayload({ 'salatibox:fasting': '{"2026-03-01":true}' });
    const code = `  ${encodeSyncPayload(payload)}\n`;
    expect(decodeSyncPayload(code)).toEqual(payload);
  });
});
