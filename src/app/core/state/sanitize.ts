import type { Example, FeatureId, FeatureModel, ModelId, Selection } from '../model/feature-model.types';

/**
 * Drops any feature id that does not exist in the model. This is the one
 * invariant the store cannot get for free from the engine: after switching
 * examples, loading a hand-authored preset, or decoding a share link, a
 * manual selection may reference ids from a different model. Idempotent —
 * sanitizing an already-clean selection is a no-op.
 */
export function sanitizeModelManual(model: FeatureModel, manual: ReadonlySet<FeatureId>): Set<FeatureId> {
  const valid = new Set<FeatureId>();
  for (const id of manual) {
    if (model.features[id]) valid.add(id);
  }
  return valid;
}

export function sanitizeSelection(example: Example, manual: Selection): Selection {
  const next = new Map<ModelId, ReadonlySet<FeatureId>>();
  for (const model of example.models) {
    next.set(model.id, sanitizeModelManual(model, manual.get(model.id) ?? new Set()));
  }
  return next;
}

/** Removes a feature and every descendant of it from a mutable set — used when deselecting. */
export function removeWithDescendants(model: FeatureModel, featureId: FeatureId, set: Set<FeatureId>): void {
  set.delete(featureId);
  const feature = model.features[featureId];
  if (!feature) return;
  for (const childId of feature.childIds) {
    removeWithDescendants(model, childId, set);
  }
}
