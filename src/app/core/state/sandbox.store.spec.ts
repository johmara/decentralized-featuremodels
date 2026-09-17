import { beforeEach, describe, expect, it } from 'vitest';
import { SandboxStore } from './sandbox.store';

describe('SandboxStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when there is nothing saved', () => {
    const store = new SandboxStore();
    expect(store.example().models).toHaveLength(0);
  });

  it('addScope then addFeature grows history by two steps, both undoable', () => {
    const store = new SandboxStore();
    store.addScope({ id: 'a', name: 'A', assetPath: 'a/', ownerLabel: 'Me', colorToken: '--team-messaging' });
    expect(store.example().models).toHaveLength(1);

    store.addFeature('a', { id: 'X', name: 'X', parentId: 'Root', kind: 'optional' });
    expect(store.example().models[0].features['X']).toBeDefined();

    expect(store.canUndo()).toBe(true);
    store.undo();
    expect(store.example().models[0].features['X']).toBeUndefined();
    store.undo();
    expect(store.example().models).toHaveLength(0);
    expect(store.canUndo()).toBe(false);

    store.redo();
    store.redo();
    expect(store.example().models[0].features['X']).toBeDefined();
  });

  it('a new edit after undo truncates the redo history', () => {
    const store = new SandboxStore();
    store.addScope({ id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    store.addScope({ id: 'b', name: 'B', assetPath: '', ownerLabel: '', colorToken: '' });
    store.undo();
    expect(store.canRedo()).toBe(true);

    store.addScope({ id: 'c', name: 'C', assetPath: '', ownerLabel: '', colorToken: '' });
    expect(store.canRedo()).toBe(false);
    expect(store.example().models.map((m) => m.id)).toEqual(['a', 'c']);
  });

  it('an invalid edit sets lastError and leaves the example unchanged', () => {
    const store = new SandboxStore();
    store.addScope({ id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    const before = store.example();

    store.addScope({ id: 'a', name: 'A again', assetPath: '', ownerLabel: '', colorToken: '' });

    expect(store.lastError()).not.toBeNull();
    expect(store.example()).toBe(before);
  });

  it('persists across instances via localStorage', () => {
    const first = new SandboxStore();
    first.addScope({ id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });

    const second = new SandboxStore();
    expect(second.example().models).toHaveLength(1);
    expect(second.example().models[0].id).toBe('a');
  });

  it('reset clears both in-memory history and the persisted copy', () => {
    const first = new SandboxStore();
    first.addScope({ id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    first.reset();

    const second = new SandboxStore();
    expect(second.example().models).toHaveLength(0);
  });

  it('importJson replaces the example, and rejects invalid JSON without throwing', () => {
    const store = new SandboxStore();
    store.importJson(JSON.stringify({ id: 'x', title: 'X', blurb: '', models: [], capabilities: [], globalRules: [], assetTree: { path: '/', kind: 'repo', children: [] }, presets: [] }));
    expect(store.example().id).toBe('x');

    expect(() => store.importJson('not json')).not.toThrow();
    expect(store.lastError()).not.toBeNull();
  });

  it('exportJson round-trips through importJson', () => {
    const store = new SandboxStore();
    store.addScope({ id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    const json = store.exportJson();

    const other = new SandboxStore();
    other.importJson(json);
    expect(other.example().models[0]?.id).toBe('a');
  });
});
