import { describe, expect, it } from 'vitest';
import { propagate } from './propagate';
import { setsEqual } from './set-utils';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import type { FeatureModel } from '../model/feature-model.types';

function modelOf(id: string): FeatureModel {
  const model = PHONE_EXAMPLE.models.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model "${id}"`);
  return model;
}

describe('propagate', () => {
  it('derives mandatory descendants from an empty manual selection', () => {
    const result = propagate(modelOf('phone.keyboard'), new Set());
    expect(result.complete).toBe(true);
    expect(result.consistent).toBe(true);
    expect(result.selection.has('BaseKeyboard')).toBe(true);
    expect(result.selection.has('Layouts')).toBe(true);
    // No specific layout is common to all 3 remaining completions.
    expect(result.selection.has('QWERTY')).toBe(false);
    expect(result.dead.size).toBe(0);
  });

  it('derives the parent and marks sibling XOR members dead once one layout is manually picked', () => {
    const result = propagate(modelOf('phone.keyboard'), new Set(['QWERTY']));
    expect(result.selection.has('QWERTY')).toBe(true);
    expect(result.selection.has('BaseKeyboard')).toBe(true);
    expect(result.dead.has('AZERTY')).toBe(true);
    expect(result.dead.has('QWERTZ')).toBe(true);
  });

  it('reports inconsistency when manual selects two XOR members at once', () => {
    const result = propagate(modelOf('phone.keyboard'), new Set(['QWERTY', 'AZERTY']));
    expect(result.consistent).toBe(false);
  });

  it('every derived feature carries a non-empty explanation', () => {
    const result = propagate(modelOf('phone.keyboard'), new Set(['QWERTY']));
    expect(result.derived.size).toBeGreaterThan(0);
    expect(result.explanations.length).toBe(result.derived.size);
    for (const explanation of result.explanations) {
      expect(explanation.detail.length).toBeGreaterThan(0);
    }
  });

  it('is idempotent: propagating the derived selection back in yields the same selection', () => {
    const first = propagate(modelOf('phone.keyboard'), new Set(['QWERTY']));
    const second = propagate(modelOf('phone.keyboard'), new Set(first.selection));
    expect(setsEqual(second.selection, first.selection)).toBe(true);
  });

  it('never derives a feature whose ancestors are not also in the selection', () => {
    for (const model of PHONE_EXAMPLE.models) {
      const result = propagate(model, new Set());
      for (const featureId of result.selection) {
        const feature = model.features[featureId];
        if (feature.parentId !== null) {
          expect(result.selection.has(feature.parentId)).toBe(true);
        }
      }
    }
  });
});
