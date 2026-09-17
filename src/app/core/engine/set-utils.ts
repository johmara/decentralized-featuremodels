import type { FeatureId, FeatureModel } from '../model/feature-model.types';

/** Returns a copy of manual with the model's root feature added — the root is always implicitly present. */
export function withRoot(model: FeatureModel, manual: ReadonlySet<FeatureId>): Set<FeatureId> {
  const sel = new Set(manual);
  sel.add(model.rootId);
  return sel;
}

export function isSuperset(set: ReadonlySet<FeatureId>, subset: ReadonlySet<FeatureId>): boolean {
  for (const id of subset) {
    if (!set.has(id)) return false;
  }
  return true;
}

/** Intersection of one or more sets. Empty input yields an empty set. */
export function intersection(sets: readonly ReadonlySet<FeatureId>[]): Set<FeatureId> {
  if (sets.length === 0) return new Set();
  const [first, ...rest] = sets;
  const result = new Set(first);
  for (const id of result) {
    if (!rest.every((s) => s.has(id))) {
      result.delete(id);
    }
  }
  return result;
}

export function setMinus(a: ReadonlySet<FeatureId>, b: ReadonlySet<FeatureId>): Set<FeatureId> {
  const result = new Set<FeatureId>();
  for (const id of a) {
    if (!b.has(id)) result.add(id);
  }
  return result;
}

export function setsEqual(a: ReadonlySet<FeatureId>, b: ReadonlySet<FeatureId>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
