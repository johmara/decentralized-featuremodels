import { describe, expect, it } from 'vitest';
import {
  SandboxEditError,
  addCapability,
  addFeature,
  addMutexRule,
  addScope,
  emptySandboxExample,
  removeCapability,
  removeFeature,
  removeGlobalRule,
  removeScope,
  renameFeature,
  renameScope,
  setFeatureCapabilities,
  setFeatureKind,
  suggestFeatureId,
  suggestScopeId,
} from './sandbox-edit';
import { validateExample } from './validate-example';
import { checkLocal } from './validity';
import { resolveGlobal } from './resolver';

describe('sandbox-edit', () => {
  it('builds a two-scope model from scratch that resolves correctly', () => {
    let example = emptySandboxExample();
    example = addCapability(example, { id: 'Net', name: 'Net', description: 'Network access.' });
    example = addScope(example, { id: 'a', name: 'Scope A', assetPath: 'a/', ownerLabel: 'A team', colorToken: '--team-messaging' });
    example = addScope(example, { id: 'b', name: 'Scope B', assetPath: 'b/', ownerLabel: 'B team', colorToken: '--team-connectivity' });
    example = addFeature(example, 'a', { id: 'Needs', name: 'Needs Net', parentId: 'Root', kind: 'optional', requires: ['Net'] });
    example = addFeature(example, 'b', { id: 'Provider', name: 'Net Provider', parentId: 'Root', kind: 'optional', provides: ['Net'] });

    expect(validateExample(example)).toEqual([]);

    const selection = new Map([
      ['a', new Set(['Needs'])],
      ['b', new Set(['Provider'])],
    ]);
    expect(resolveGlobal(example, selection).valid).toBe(true);
  });

  it('reports missing capability when the provider is not selected', () => {
    let example = emptySandboxExample();
    example = addCapability(example, { id: 'Net', name: 'Net', description: '' });
    example = addScope(example, { id: 'a', name: 'A', assetPath: 'a/', ownerLabel: '', colorToken: '' });
    example = addScope(example, { id: 'b', name: 'B', assetPath: 'b/', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'Needs', name: 'Needs Net', parentId: 'Root', kind: 'optional', requires: ['Net'] });
    example = addFeature(example, 'b', { id: 'Provider', name: 'Provider', parentId: 'Root', kind: 'optional', provides: ['Net'] });

    const selection = new Map([['a', new Set(['Needs'])], ['b', new Set<string>()]]);
    const result = resolveGlobal(example, selection);
    expect(result.valid).toBe(false);
    expect(result.missing[0]?.notifyModels).toEqual(['b']);
  });

  it('creates and grows an OR group across multiple addFeature calls', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: 'a/', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'or' });
    example = addFeature(example, 'a', { id: 'Y', name: 'Y', parentId: 'Root', kind: 'or' });

    const model = example.models[0];
    const groupIds = Object.keys(model.groups);
    expect(groupIds).toHaveLength(1);
    expect(model.groups[groupIds[0]].memberIds).toEqual(['X', 'Y']);
    expect(model.features['X'].edge).toBe('grouped');
    expect(model.features['Y'].groupId).toBe(groupIds[0]);
  });

  it('rejects a duplicate scope id', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    expect(() => addScope(example, { id: 'a', name: 'A2', assetPath: '', ownerLabel: '', colorToken: '' })).toThrow(
      SandboxEditError,
    );
  });

  it('rejects adding a feature to an unknown scope or unknown parent', () => {
    const example = emptySandboxExample();
    expect(() => addFeature(example, 'ghost', { id: 'X', name: 'X', parentId: 'Root', kind: 'optional' })).toThrow(
      SandboxEditError,
    );

    let withScope = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    expect(() =>
      addFeature(withScope, 'a', { id: 'X', name: 'X', parentId: 'GhostParent', kind: 'optional' }),
    ).toThrow(SandboxEditError);
  });

  it('rejects removing the root feature and removing a feature with children', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'Child', name: 'Child', parentId: 'Root', kind: 'optional' });

    expect(() => removeFeature(example, 'a', 'Root')).toThrow(SandboxEditError);
    expect(() => removeFeature(example, 'a', 'Root')).toThrow(/root feature/);
  });

  it('removeFeature cleans up the parent childIds, the group membership, and featureOrder', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'or' });
    example = addFeature(example, 'a', { id: 'Y', name: 'Y', parentId: 'Root', kind: 'or' });

    example = removeFeature(example, 'a', 'Y');

    const model = example.models[0];
    expect(model.features['Root'].childIds).toEqual(['X']);
    expect(model.featureOrder).not.toContain('Y');
    const group = model.groups[Object.keys(model.groups)[0]];
    expect(group.memberIds).toEqual(['X']);

    expect(validateExample(example)).toEqual([]);
  });

  it('removing every member of a group deletes the group entirely', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'xor' });
    example = removeFeature(example, 'a', 'X');
    expect(Object.keys(example.models[0].groups)).toHaveLength(0);
  });

  it('setFeatureCapabilities replaces requires/provides on an existing feature', () => {
    let example = emptySandboxExample();
    example = addCapability(example, { id: 'C1', name: 'C1', description: '' });
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'optional' });
    example = setFeatureCapabilities(example, 'a', 'X', 'requires', ['C1']);
    expect(example.models[0].features['X'].requires).toEqual(['C1']);
  });

  it('removing a scope leaves the rest of the example structurally valid', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addScope(example, { id: 'b', name: 'B', assetPath: '', ownerLabel: '', colorToken: '' });
    example = removeScope(example, 'a');
    expect(example.models).toHaveLength(1);
    expect(validateExample(example)).toEqual([]);
  });

  it('addMutexRule rejects a capability paired with itself', () => {
    const example = emptySandboxExample();
    expect(() => addMutexRule(example, 'X', 'X', 'because')).toThrow(SandboxEditError);
  });

  it('addMutexRule / removeGlobalRule round-trip', () => {
    let example = emptySandboxExample();
    example = addMutexRule(example, 'A', 'B', 'because');
    expect(example.globalRules).toHaveLength(1);
    example = removeGlobalRule(example, 0);
    expect(example.globalRules).toHaveLength(0);
  });

  it('removeCapability leaves dangling requires as an unprovidable diagnosis, not a crash', () => {
    let example = emptySandboxExample();
    example = addCapability(example, { id: 'Net', name: 'Net', description: '' });
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'Needs', name: 'Needs', parentId: 'Root', kind: 'optional', requires: ['Net'] });
    example = removeCapability(example, 'Net');

    const selection = new Map([['a', new Set(['Needs'])]]);
    const result = resolveGlobal(example, selection);
    expect(result.valid).toBe(false);
    expect(result.missing[0]?.diagnosis).toBe('unprovidable');
  });

  it('every intermediate state produced while building stays checkable by checkLocal without throwing', () => {
    let example = emptySandboxExample();
    example = addScope(example, { id: 'a', name: 'A', assetPath: '', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'mandatory' });
    example = addFeature(example, 'a', { id: 'Y', name: 'Y', parentId: 'X', kind: 'xor' });
    example = addFeature(example, 'a', { id: 'Z', name: 'Z', parentId: 'X', kind: 'xor' });

    for (const model of example.models) {
      expect(() => checkLocal(model, new Set())).not.toThrow();
    }
    expect(validateExample(example)).toEqual([]);
  });

  it('setFeatureKind moves a feature between edge kinds and groups, keeping the model valid', () => {
    let example = addScope(emptySandboxExample(), { id: 'a', name: 'A', assetPath: 'a/', ownerLabel: '', colorToken: '' });
    example = addFeature(example, 'a', { id: 'X', name: 'X', parentId: 'Root', kind: 'optional' });
    example = addFeature(example, 'a', { id: 'Y', name: 'Y', parentId: 'Root', kind: 'or' });

    example = setFeatureKind(example, 'a', 'X', 'or');
    expect(example.models[0].groups['Root::or'].memberIds).toEqual(['Y', 'X']);
    expect(validateExample(example)).toEqual([]);

    example = setFeatureKind(example, 'a', 'Y', 'mandatory');
    example = setFeatureKind(example, 'a', 'X', 'xor');
    expect(example.models[0].groups['Root::or']).toBeUndefined();
    expect(example.models[0].features['Y'].edge).toBe('mandatory');
    expect(example.models[0].features['Y'].groupId).toBeUndefined();
    expect(example.models[0].features['X'].groupId).toBe('Root::xor');
    expect(validateExample(example)).toEqual([]);

    expect(() => setFeatureKind(example, 'a', 'Root', 'optional')).toThrow(SandboxEditError);
  });

  it('renames features and scopes without changing ids, and rejects empty names', () => {
    let example = addScope(emptySandboxExample(), { id: 'a', name: 'A', assetPath: 'a/', ownerLabel: '', colorToken: '' });
    example = renameScope(example, 'a', 'Billing');
    example = renameFeature(example, 'a', 'Root', 'Billing Root');
    expect(example.models[0].id).toBe('a');
    expect(example.models[0].name).toBe('Billing');
    expect(example.models[0].features['Root'].name).toBe('Billing Root');
    expect(() => renameFeature(example, 'a', 'Root', '  ')).toThrow(SandboxEditError);
  });

  it('suggests unique ids from display names', () => {
    let example = addScope(emptySandboxExample(), { id: 'billing-service', name: 'B', assetPath: '', ownerLabel: '', colorToken: '' });
    expect(suggestScopeId(example, 'Billing Service')).toBe('billing-service2');
    expect(suggestScopeId(example, '!!!')).toBe('scope');
    example = addFeature(example, 'billing-service', { id: 'OrderEmails', name: 'x', parentId: 'Root', kind: 'optional' });
    expect(suggestFeatureId(example.models[0], 'order emails')).toBe('OrderEmails2');
    expect(suggestFeatureId(example.models[0], 'Gift cards')).toBe('GiftCards');
  });
});
