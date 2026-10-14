import { describe, expect, it } from 'vitest';
import { resolveGlobal } from './resolver';
import { propagateAll } from './propagate';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import type { FeatureId, ModelId, Selection } from '../model/feature-model.types';

function selectionFromPreset(id: string): Selection {
  const preset = PHONE_EXAMPLE.presets.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset "${id}"`);
  const manual = new Map<ModelId, ReadonlySet<FeatureId>>();
  for (const [modelId, ids] of Object.entries(preset.selection)) {
    manual.set(modelId, new Set(ids));
  }
  return manual;
}

function resolvePreset(id: string) {
  const manual = selectionFromPreset(id);
  const { selection } = propagateAll(PHONE_EXAMPLE, manual);
  return resolveGlobal(PHONE_EXAMPLE, selection);
}

describe('resolveGlobal', () => {
  it('is globally valid for the comic-email preset', () => {
    const result = resolvePreset('comic-email');
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.ruleViolations).toEqual([]);
  });

  it('reports InternetConnectivity missing and notifies only Connectivity for the missing-internet preset', () => {
    const result = resolvePreset('missing-internet');
    expect(result.valid).toBe(false);

    const missingNet = result.missing.find((m) => m.capability === 'InternetConnectivity');
    expect(missingNet).toBeDefined();
    expect(missingNet?.diagnosis).toBe('unprovisioned');
    expect(missingNet?.notifyModels).toEqual(['phone.connectivity']);
    // The requiring feature's own model must never be the one notified, unless it is itself a provider.
    expect(missingNet?.notifyModels).not.toContain('phone.messaging');
  });

  it('trips the SecureStorage/InsecureStorage mutex for the encrypted-friction preset', () => {
    const result = resolvePreset('encrypted-friction');
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([]);
    expect(result.ruleViolations).toHaveLength(1);
    expect(result.ruleViolations[0].rule).toMatchObject({ kind: 'capability-mutex', a: 'SecureStorage', b: 'InsecureStorage' });
  });

  it('diagnoses a capability with zero providers anywhere as unprovidable', () => {
    const orphanExample = {
      ...PHONE_EXAMPLE,
      capabilities: [...PHONE_EXAMPLE.capabilities, { id: 'GhostCapability', name: 'Ghost', description: 'No provider exists.' }],
      models: PHONE_EXAMPLE.models.map((model) =>
        model.id === 'phone.messaging'
          ? {
              ...model,
              features: {
                ...model.features,
                Messaging: { ...model.features['Messaging'], requires: ['KeyboardInput', 'GhostCapability'] },
              },
            }
          : model,
      ),
    };
    const { selection } = propagateAll(orphanExample, selectionFromPreset('comic-email'));
    const result = resolveGlobal(orphanExample, selection);
    const ghost = result.missing.find((m) => m.capability === 'GhostCapability');
    expect(ghost?.diagnosis).toBe('unprovidable');
    expect(ghost?.notifyModels).toEqual([]);
  });
});
