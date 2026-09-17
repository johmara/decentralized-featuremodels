import { describe, expect, it } from 'vitest';
import { decodeSelection, encodeSelection } from './config-codec';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import type { FeatureId, ModelId, Selection } from '../model/feature-model.types';

function selectionFromPreset(id: string): Selection {
  const preset = PHONE_EXAMPLE.presets.find((p) => p.id === id)!;
  const manual = new Map<ModelId, ReadonlySet<FeatureId>>();
  for (const [modelId, ids] of Object.entries(preset.selection)) {
    manual.set(modelId, new Set(ids));
  }
  return manual;
}

function selectionsEqual(a: Selection, b: Selection, example = PHONE_EXAMPLE): boolean {
  return example.models.every((model) => {
    const aSet = a.get(model.id) ?? new Set();
    const bSet = b.get(model.id) ?? new Set();
    if (aSet.size !== bSet.size) return false;
    for (const id of aSet) if (!bSet.has(id)) return false;
    return true;
  });
}

describe('config-codec', () => {
  it('round-trips the comic-email preset selection', () => {
    const selection = selectionFromPreset('comic-email');
    const encoded = encodeSelection(PHONE_EXAMPLE, selection);
    const decoded = decodeSelection(PHONE_EXAMPLE, encoded);
    expect(decoded).not.toBeNull();
    expect(selectionsEqual(selection, decoded!)).toBe(true);
  });

  it('round-trips an empty selection', () => {
    const encoded = encodeSelection(PHONE_EXAMPLE, new Map());
    const decoded = decodeSelection(PHONE_EXAMPLE, encoded);
    expect(decoded).not.toBeNull();
    for (const model of PHONE_EXAMPLE.models) {
      expect(decoded!.get(model.id)?.size ?? 0).toBe(0);
    }
  });

  it('rejects malformed input', () => {
    expect(decodeSelection(PHONE_EXAMPLE, 'not-a-valid-payload')).toBeNull();
    expect(decodeSelection(PHONE_EXAMPLE, 'v1~phone~!!!not-base64!!!')).toBeNull();
    expect(decodeSelection(PHONE_EXAMPLE, '')).toBeNull();
  });

  it('rejects a payload truncated shorter than the example needs', () => {
    expect(decodeSelection(PHONE_EXAMPLE, 'v1~phone~AA')).toBeNull();
  });

  it('rejects a payload encoded for a different example rather than misreading it', () => {
    const selection = selectionFromPreset('comic-email');
    const encoded = encodeSelection(PHONE_EXAMPLE, selection);
    const forOtherExample = encoded.replace('~phone~', '~some-other-example~');
    expect(decodeSelection(PHONE_EXAMPLE, forOtherExample)).toBeNull();
  });
});
