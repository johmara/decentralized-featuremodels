import type { Example, FeatureId, ModelId, Selection } from '../model/feature-model.types';

/**
 * Encodes a manual selection as a versioned, example-scoped bitset:
 * `v1~<exampleId>~<base64url bits>`, one bit per feature in
 * `example.models[i].featureOrder` concatenated model-major. The example
 * id is embedded so a link generated for one example is rejected — not
 * silently misread — against a different one.
 */
export function encodeSelection(example: Example, manual: Selection): string {
  const bits: boolean[] = [];
  for (const model of example.models) {
    const selected = manual.get(model.id) ?? new Set<FeatureId>();
    for (const featureId of model.featureOrder) {
      bits.push(selected.has(featureId));
    }
  }

  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  bits.forEach((bit, i) => {
    if (bit) bytes[i >> 3] |= 1 << (i % 8);
  });

  return `v1~${example.id}~${toBase64Url(bytes)}`;
}

export function decodeSelection(example: Example, encoded: string): Selection | null {
  const match = /^v1~([^~]*)~(.*)$/.exec(encoded);
  if (!match) return null;

  const [, exampleId, payload] = match;
  if (exampleId !== example.id) return null;

  let bytes: Uint8Array;
  try {
    bytes = fromBase64Url(payload);
  } catch {
    return null;
  }

  const totalBits = example.models.reduce((sum, model) => sum + model.featureOrder.length, 0);
  if (bytes.length < Math.ceil(totalBits / 8)) return null;

  const result = new Map<ModelId, ReadonlySet<FeatureId>>();
  let bitIndex = 0;
  for (const model of example.models) {
    const selected = new Set<FeatureId>();
    for (const featureId of model.featureOrder) {
      const byte = bytes[bitIndex >> 3] ?? 0;
      if ((byte & (1 << (bitIndex % 8))) !== 0) selected.add(featureId);
      bitIndex++;
    }
    result.set(model.id, selected);
  }

  return result;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function fromBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) throw new Error('Invalid base64url payload');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
