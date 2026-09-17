import { describe, expect, it } from 'vitest';
import { validateExample } from '../../core/engine/validate-example';
import { propagateAll } from '../../core/engine/propagate';
import { resolveGlobal } from '../../core/engine/resolver';
import { EXAMPLES } from './index';
import type { FeatureId, ModelId, Selection } from '../../core/model/feature-model.types';

function selectionFromPreset(exampleId: string, presetId: string): Selection {
  const example = EXAMPLES[exampleId];
  const preset = example.presets.find((p) => p.id === presetId);
  if (!preset) throw new Error(`Unknown preset "${presetId}" for example "${exampleId}"`);
  const manual = new Map<ModelId, ReadonlySet<FeatureId>>();
  for (const [modelId, ids] of Object.entries(preset.selection)) {
    manual.set(modelId, new Set(ids));
  }
  return manual;
}

describe('every shipped example', () => {
  for (const [id, example] of Object.entries(EXAMPLES)) {
    it(`"${id}" has no structural data errors`, () => {
      expect(validateExample(example)).toEqual([]);
    });

    if (example.centralized) {
      it(`"${id}"'s centralized reference model has no structural data errors`, () => {
        expect(validateExample({ ...example, models: [example.centralized!] })).toEqual([]);
      });
    }

    it(`"${id}" resolves every preset without throwing`, () => {
      for (const preset of example.presets) {
        const manual = selectionFromPreset(id, preset.id);
        const { selection } = propagateAll(example, manual);
        expect(() => resolveGlobal(example, selection)).not.toThrow();
      }
    });
  }
});

describe('enterprise example presets', () => {
  it('"everything-wired" is globally valid, with Routing provided by two separate repos', () => {
    const manual = selectionFromPreset('enterprise', 'everything-wired');
    const { selection } = propagateAll(EXAMPLES['enterprise'], manual);
    const result = resolveGlobal(EXAMPLES['enterprise'], selection);
    expect(result.valid).toBe(true);
    expect(result.ledger.provided.get('Routing')?.length).toBe(2);
    const providerModels = new Set(result.ledger.provided.get('Routing')?.map((ref) => ref.modelId));
    expect(providerModels).toEqual(new Set(['enterprise.micro-api.routing-v2', 'enterprise.micro-api.routing-v3']));
  });

  it('"validation-disabled" reports Validation missing and notifies only the Validation v1 repo', () => {
    const manual = selectionFromPreset('enterprise', 'validation-disabled');
    const { selection } = propagateAll(EXAMPLES['enterprise'], manual);
    const result = resolveGlobal(EXAMPLES['enterprise'], selection);
    expect(result.valid).toBe(false);
    const missing = result.missing.find((m) => m.capability === 'Validation');
    expect(missing?.diagnosis).toBe('unprovisioned');
    expect(missing?.notifyModels).toEqual(['enterprise.micro-api.validation-v1']);
  });

  it('module APIs and facades each provide more than one capability; micro APIs provide exactly one', () => {
    const example = EXAMPLES['enterprise'];
    const moduleAndFacadeIds = [
      'enterprise.api-facade.default',
      'enterprise.module-api.execution',
      'enterprise.module-api.finance',
    ];
    for (const modelId of moduleAndFacadeIds) {
      const model = example.models.find((m) => m.id === modelId)!;
      const providedByRoot = model.features[model.rootId].provides ?? [];
      expect(providedByRoot.length).toBeGreaterThan(1);
    }

    const microApiIds = [
      'enterprise.micro-api.routing-v2',
      'enterprise.micro-api.routing-v3',
      'enterprise.micro-api.tracking-numbers',
    ];
    for (const modelId of microApiIds) {
      const model = example.models.find((m) => m.id === modelId)!;
      const allProvides = Object.values(model.features).flatMap((f) => f.provides ?? []);
      expect(allProvides).toHaveLength(1);
    }
  });
});

describe('distro example presets', () => {
  it('"desktop-with-mail" is globally valid', () => {
    const manual = selectionFromPreset('distro', 'desktop-with-mail');
    const { selection } = propagateAll(EXAMPLES['distro'], manual);
    expect(resolveGlobal(EXAMPLES['distro'], selection).valid).toBe(true);
  });

  it('"jffs2-governance-gap" diagnoses mtd as unprovidable, and only mtd', () => {
    const manual = selectionFromPreset('distro', 'jffs2-governance-gap');
    const { selection } = propagateAll(EXAMPLES['distro'], manual);
    const result = resolveGlobal(EXAMPLES['distro'], selection);
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].capability).toBe('mtd');
    expect(result.missing[0].diagnosis).toBe('unprovidable');
    expect(result.missing[0].notifyModels).toEqual([]);
  });
});
