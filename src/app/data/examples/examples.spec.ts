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
  it('"shipment-only" is globally valid', () => {
    const manual = selectionFromPreset('enterprise', 'shipment-only');
    const { selection } = propagateAll(EXAMPLES['enterprise'], manual);
    expect(resolveGlobal(EXAMPLES['enterprise'], selection).valid).toBe(true);
  });

  it('"routing-v3-consumer" is globally valid and pins v3', () => {
    const manual = selectionFromPreset('enterprise', 'routing-v3-consumer');
    const { selection } = propagateAll(EXAMPLES['enterprise'], manual);
    expect(selection.get('enterprise.micro-routing')?.has('RoutingV3')).toBe(true);
    expect(resolveGlobal(EXAMPLES['enterprise'], selection).valid).toBe(true);
  });

  it('"missing-invoice" reports InvoiceApi missing and notifies only Module API', () => {
    const manual = selectionFromPreset('enterprise', 'missing-invoice');
    const { selection } = propagateAll(EXAMPLES['enterprise'], manual);
    const result = resolveGlobal(EXAMPLES['enterprise'], selection);
    expect(result.valid).toBe(false);
    const missing = result.missing.find((m) => m.capability === 'InvoiceApi');
    expect(missing?.diagnosis).toBe('unprovisioned');
    expect(missing?.notifyModels).toEqual(['enterprise.module-api']);
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
