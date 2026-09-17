import type {
  CapabilityId,
  Example,
  FeatureRef,
  Selection,
} from '../model/feature-model.types';
import { ref } from '../model/feature-model.types';

export interface CapabilityLedger {
  /** Capabilities required by currently-selected features, and who requires them. */
  readonly required: ReadonlyMap<CapabilityId, readonly FeatureRef[]>;
  /** Capabilities provided by currently-selected features. */
  readonly provided: ReadonlyMap<CapabilityId, readonly FeatureRef[]>;
  /** Every feature that provides a capability, regardless of whether it is currently selected — needed for resolver attribution. */
  readonly potentialProviders: ReadonlyMap<CapabilityId, readonly FeatureRef[]>;
}

export function aggregate(example: Example, selection: Selection): CapabilityLedger {
  const required = new Map<CapabilityId, FeatureRef[]>();
  const provided = new Map<CapabilityId, FeatureRef[]>();
  const potentialProviders = new Map<CapabilityId, FeatureRef[]>();

  for (const model of example.models) {
    const sel = selection.get(model.id) ?? new Set();

    for (const featureId of model.featureOrder) {
      const feature = model.features[featureId];
      const isSelected = sel.has(featureId);

      for (const capabilityId of feature.provides ?? []) {
        pushTo(potentialProviders, capabilityId, ref(model.id, featureId));
        if (isSelected) pushTo(provided, capabilityId, ref(model.id, featureId));
      }

      if (isSelected) {
        for (const capabilityId of feature.requires ?? []) {
          pushTo(required, capabilityId, ref(model.id, featureId));
        }
      }
    }
  }

  return { required, provided, potentialProviders };
}

function pushTo<K>(map: Map<K, FeatureRef[]>, key: K, value: FeatureRef): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}
