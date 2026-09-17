import { describe, expect, it } from 'vitest';
import { centralize } from './centralize';
import { checkLocal } from './validity';
import { resolveGlobal } from './resolver';
import { validateExample } from './validate-example';
import { enumerateLocal } from './enumerate';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import { featureKey, ref } from '../model/feature-model.types';
import type { FeatureId, ModelId } from '../model/feature-model.types';

function cartesian<T>(arrays: readonly (readonly T[])[]): T[][] {
  return arrays.reduce<T[][]>((acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])), [[]]);
}

describe('centralize', () => {
  const centralModel = centralize(PHONE_EXAMPLE);

  it('produces a structurally valid model', () => {
    const wrapped = { ...PHONE_EXAMPLE, models: [centralModel] };
    expect(validateExample(wrapped)).toEqual([]);
  });

  it(
    'agrees with resolveGlobal over the decentralized example on every combination of per-model configurations',
    () => {
      const perModelConfigs = PHONE_EXAMPLE.models.map((model) => enumerateLocal(model).configs);
      for (const configs of perModelConfigs) expect(configs.length).toBeGreaterThan(0);

      const combos = cartesian(perModelConfigs);
      // 18 (messaging) x 3 (connectivity) x 6 (keyboard) x 3 (storage) = 972 — small enough to check exhaustively.
      expect(combos.length).toBe(18 * 3 * 6 * 3);

      for (const combo of combos) {
        const selection = new Map<ModelId, ReadonlySet<FeatureId>>();
        const flattened = new Set<FeatureId>();

        PHONE_EXAMPLE.models.forEach((model, i) => {
          selection.set(model.id, combo[i]);
          for (const featureId of combo[i]) {
            flattened.add(featureKey(ref(model.id, featureId)));
          }
        });

        const decentralizedValid = resolveGlobal(PHONE_EXAMPLE, selection).valid;
        const centralizedValid = checkLocal(centralModel, flattened).valid;
        expect(centralizedValid).toBe(decentralizedValid);
      }
    },
    20_000,
  );
});
