import { describe, expect, it } from 'vitest';
import { addCapability, addFeature, addGlobalRule, addScope, emptySandboxExample, SandboxEditError } from './sandbox-edit';
import { centralize } from './centralize';
import { checkLocal } from './validity';
import { resolveGlobal } from './resolver';
import { enumerateLocal } from './enumerate';
import { validateExample } from './validate-example';
import { featureKey, ref } from '../model/feature-model.types';
import type { Example, FeatureId, GlobalRule, ModelId } from '../model/feature-model.types';

/** Three scopes: two that can each provide Cache, one that can provide Metrics. */
function base(): Example {
  let example = emptySandboxExample();
  example = addCapability(example, { id: 'Cache', name: 'Cache', description: '' });
  example = addCapability(example, { id: 'Metrics', name: 'Metrics', description: '' });
  for (const id of ['a', 'b', 'c']) {
    example = addScope(example, { id, name: id, assetPath: '', ownerLabel: '', colorToken: '' });
  }
  example = addFeature(example, 'a', { id: 'CacheA', name: 'Cache A', parentId: 'Root', kind: 'optional', provides: ['Cache'] });
  example = addFeature(example, 'b', { id: 'CacheB', name: 'Cache B', parentId: 'Root', kind: 'optional', provides: ['Cache'] });
  example = addFeature(example, 'c', { id: 'Metrics', name: 'Metrics', parentId: 'Root', kind: 'optional', provides: ['Metrics'] });
  return example;
}

function selectionOf(picks: Record<string, string[]>): Map<ModelId, ReadonlySet<FeatureId>> {
  return new Map(['a', 'b', 'c'].map((id) => [id, new Set(['Root', ...(picks[id] ?? [])])]));
}

function cartesian<T>(arrays: readonly (readonly T[])[]): T[][] {
  return arrays.reduce<T[][]>((acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])), [[]]);
}

describe('global rules', () => {
  it('capability-implies is violated only when a is provided and b is not', () => {
    const example = addGlobalRule(base(), { kind: 'capability-implies', a: 'Cache', b: 'Metrics', rationale: '' });
    expect(resolveGlobal(example, selectionOf({})).valid).toBe(true);
    expect(resolveGlobal(example, selectionOf({ a: ['CacheA'] })).ruleViolations).toHaveLength(1);
    expect(resolveGlobal(example, selectionOf({ a: ['CacheA'], c: ['Metrics'] })).valid).toBe(true);
    expect(resolveGlobal(example, selectionOf({ c: ['Metrics'] })).valid).toBe(true);
  });

  it('capability-single-provider is violated only by two or more providers', () => {
    const example = addGlobalRule(base(), { kind: 'capability-single-provider', capability: 'Cache', rationale: '' });
    expect(resolveGlobal(example, selectionOf({ a: ['CacheA'] })).valid).toBe(true);
    const result = resolveGlobal(example, selectionOf({ a: ['CacheA'], b: ['CacheB'] }));
    expect(result.valid).toBe(false);
    expect(result.ruleViolations[0].involvedProviders.map((p) => p.modelId)).toEqual(['a', 'b']);
  });

  it('rejects self-referencing rules', () => {
    expect(() => addGlobalRule(base(), { kind: 'capability-implies', a: 'Cache', b: 'Cache', rationale: '' })).toThrow(SandboxEditError);
  });

  const rules: GlobalRule[] = [
    { kind: 'capability-mutex', a: 'Cache', b: 'Metrics', rationale: '' },
    { kind: 'capability-implies', a: 'Cache', b: 'Metrics', rationale: '' },
    { kind: 'capability-single-provider', capability: 'Cache', rationale: '' },
  ];
  for (const rule of rules) {
    it(`centralize agrees with resolveGlobal for ${rule.kind}`, () => {
      const example = addGlobalRule(base(), rule);
      expect(validateExample(example)).toEqual([]);
      const central = centralize(example);
      const combos = cartesian(example.models.map((model) => enumerateLocal(model).configs));
      for (const combo of combos) {
        const selection = new Map<ModelId, ReadonlySet<FeatureId>>();
        const flattened = new Set<FeatureId>();
        example.models.forEach((model, i) => {
          selection.set(model.id, combo[i]);
          for (const featureId of combo[i]) flattened.add(featureKey(ref(model.id, featureId)));
        });
        expect(checkLocal(central, flattened).valid).toBe(resolveGlobal(example, selection).valid);
      }
    });
  }
});
