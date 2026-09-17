import { describe, expect, it } from 'vitest';
import { ConfigStore } from './config.store';

describe('ConfigStore', () => {
  it('starts on the phone example, centralized mode, empty selection', () => {
    const store = new ConfigStore();
    expect(store.exampleId()).toBe('phone');
    expect(store.mode()).toBe('centralized');
    expect(store.manual().size).toBe(0);
  });

  it('toggling a feature adds it to that model’s manual selection', () => {
    const store = new ConfigStore();
    store.toggle({ modelId: 'phone.messaging', featureId: 'Email' });
    expect(store.manual().get('phone.messaging')?.has('Email')).toBe(true);
  });

  it('toggling a selected feature off removes it and its manual descendants', () => {
    const store = new ConfigStore();
    store.toggle({ modelId: 'phone.messaging', featureId: 'Email' });
    store.toggle({ modelId: 'phone.messaging', featureId: 'ComicEmail' });
    expect(store.manual().get('phone.messaging')?.has('ComicEmail')).toBe(true);

    store.toggle({ modelId: 'phone.messaging', featureId: 'Email' });
    expect(store.manual().get('phone.messaging')?.has('Email')).toBe(false);
    expect(store.manual().get('phone.messaging')?.has('ComicEmail')).toBe(false);
  });

  it('rejects a cross-scope toggle with E_SCOPE_BOUNDARY and leaves the other model untouched', () => {
    const store = new ConfigStore();
    store.setScope('phone.messaging');

    const before = store.manual().get('phone.connectivity');
    const result = store.toggle({ modelId: 'phone.connectivity', featureId: 'MobileData' });

    expect(result.ok).toBe(false);
    expect(result.reason?.code).toBe('E_SCOPE_BOUNDARY');
    expect(store.manual().get('phone.connectivity')).toEqual(before);
  });

  it('allows an in-scope toggle while a scope lock is active', () => {
    const store = new ConfigStore();
    store.setScope('phone.messaging');
    const result = store.toggle({ modelId: 'phone.messaging', featureId: 'Email' });
    expect(result.ok).toBe(true);
    expect(store.manual().get('phone.messaging')?.has('Email')).toBe(true);
  });

  it('no sequence of in-scope toggles ever changes another model’s manual set', () => {
    const store = new ConfigStore();
    store.toggle({ modelId: 'phone.connectivity', featureId: 'MobileData' });
    const connectivityBefore = new Set(store.manual().get('phone.connectivity'));

    store.setScope('phone.messaging');
    for (const featureId of ['Email', 'ComicEmail', 'Attachments', 'EncryptedMessaging']) {
      store.toggle({ modelId: 'phone.messaging', featureId });
    }

    expect(store.manual().get('phone.connectivity')).toEqual(connectivityBefore);
  });

  it('loadPreset replaces the manual selection with the preset’s selection', () => {
    const store = new ConfigStore();
    store.loadPreset('comic-email');
    expect(store.manual().get('phone.messaging')?.has('ComicEmail')).toBe(true);
    expect(store.global().valid).toBe(true);
  });

  it('reset clears the manual selection back to empty', () => {
    const store = new ConfigStore();
    store.loadPreset('comic-email');
    store.reset();
    expect(store.manual().size).toBe(0);
  });

  it('switching examples clears manual selection and scope lock', () => {
    const store = new ConfigStore();
    store.loadPreset('comic-email');
    store.setScope('phone.messaging');
    store.setExample('phone');
    expect(store.manual().size).toBe(0);
    expect(store.activeScope()).toBeNull();
  });
});
