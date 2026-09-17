import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import { checkLocal } from './validity';
import { resolveGlobal } from './resolver';
import type { FeatureId, Selection } from '../model/feature-model.types';

function arbSubset(ids: readonly FeatureId[]) {
  return fc.subarray([...ids]).map((arr) => new Set(arr));
}

describe('local validity independence', () => {
  it('a model’s local validity result never depends on any other model’s selection', () => {
    const models = PHONE_EXAMPLE.models;
    const arbSelectionTuple = fc.tuple(...models.map((m) => arbSubset(m.featureOrder)));

    fc.assert(
      fc.property(arbSelectionTuple, arbSelectionTuple, (selA, selB) => {
        const fixed = selA[0];
        const selection1: Selection = new Map(models.map((m, i) => [m.id, i === 0 ? fixed : selA[i]]));
        const selection2: Selection = new Map(models.map((m, i) => [m.id, i === 0 ? fixed : selB[i]]));

        const result1 = resolveGlobal(PHONE_EXAMPLE, selection1).localResults.get(models[0].id);
        const result2 = resolveGlobal(PHONE_EXAMPLE, selection2).localResults.get(models[0].id);
        const direct = checkLocal(models[0], fixed);

        expect(result1?.valid).toBe(direct.valid);
        expect(result2?.valid).toBe(direct.valid);
        expect(result1?.violations.length).toBe(direct.violations.length);
        expect(result2?.violations.length).toBe(direct.violations.length);
      }),
      { numRuns: 300 },
    );
  });
});

describe('only capability clauses cross model boundaries', () => {
  it('no local Constraint ever references a FeatureId outside its own model', () => {
    for (const model of PHONE_EXAMPLE.models) {
      const localIds = new Set(model.featureOrder);
      for (const constraint of model.constraints) {
        expect(localIds.has(constraint.source)).toBe(true);
        if (constraint.kind === 'requiresAny') {
          for (const targetId of constraint.targets) expect(localIds.has(targetId)).toBe(true);
        } else {
          expect(localIds.has(constraint.target)).toBe(true);
        }
      }
    }
  });
});

describe('resolver attribution correctness', () => {
  it('notifyModels is always drawn from providers, never from the requiring model alone', () => {
    const models = PHONE_EXAMPLE.models;
    const arbSelectionTuple = fc.tuple(...models.map((m) => arbSubset(m.featureOrder)));

    fc.assert(
      fc.property(arbSelectionTuple, (sel) => {
        const selection: Selection = new Map(models.map((m, i) => [m.id, sel[i]]));
        const result = resolveGlobal(PHONE_EXAMPLE, selection);

        for (const missing of result.missing) {
          const providerModels = new Set(missing.potentialProviders.map((p) => p.modelId));
          for (const modelId of missing.notifyModels) {
            expect(providerModels.has(modelId)).toBe(true);
          }
          expect(missing.notifyModels.length === 0).toBe(missing.diagnosis === 'unprovidable');
        }
      }),
      { numRuns: 300 },
    );
  });
});
