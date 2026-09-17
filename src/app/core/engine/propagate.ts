import type { Example, FeatureId, FeatureModel, ModelId, Selection } from '../model/feature-model.types';
import { ref } from '../model/feature-model.types';
import { enumerateLocal } from './enumerate';
import { explain, type Explanation } from './explain';
import { intersection, isSuperset, setMinus, withRoot } from './set-utils';

export interface ModelPropagation {
  readonly modelId: ModelId;
  readonly manual: ReadonlySet<FeatureId>;
  /** manual plus every forced consequence — what the model actually renders as selected. */
  readonly selection: ReadonlySet<FeatureId>;
  readonly derived: ReadonlySet<FeatureId>;
  /** Features that cannot be selected in any valid completion of the current manual selection. */
  readonly dead: ReadonlySet<FeatureId>;
  /** False iff no valid configuration extends the current manual selection. */
  readonly consistent: boolean;
  /** False iff enumeration was truncated and a unit-propagation approximation was used instead. */
  readonly complete: boolean;
  readonly explanations: readonly Explanation[];
}

export interface Propagation {
  readonly byModel: ReadonlyMap<ModelId, ModelPropagation>;
  /** Convenience view: effective (post-propagation) selection per model. */
  readonly selection: Selection;
}

export function propagate(model: FeatureModel, manual: ReadonlySet<FeatureId>): ModelPropagation {
  const enumerated = enumerateLocal(model);

  if (!enumerated.complete) {
    return unitPropagateFallback(model, manual);
  }

  const supersets = enumerated.configs.filter((cfg) => isSuperset(cfg, manual));

  if (supersets.length === 0) {
    const selection = withRoot(model, manual);
    return {
      modelId: model.id,
      manual,
      selection,
      derived: setMinus(selection, manual),
      dead: new Set(),
      consistent: false,
      complete: true,
      explanations: [
        explain({
          code: 'E_MANDATORY_UNSELECTED',
          detail: 'This selection cannot be completed into any valid configuration for this model.',
        }),
      ],
    };
  }

  const selection = intersection(supersets);
  const derived = setMinus(selection, manual);
  const dead = new Set<FeatureId>();
  for (const featureId of model.featureOrder) {
    if (supersets.every((cfg) => !cfg.has(featureId))) dead.add(featureId);
  }

  return {
    modelId: model.id,
    manual,
    selection,
    derived,
    dead,
    consistent: true,
    complete: true,
    explanations: [...derived].map((id) => deriveExplanation(model, id)),
  };
}

export function propagateAll(example: Example, manual: Selection): Propagation {
  const byModel = new Map<ModelId, ModelPropagation>();
  const selection = new Map<ModelId, ReadonlySet<FeatureId>>();

  for (const model of example.models) {
    const modelManual = manual.get(model.id) ?? new Set<FeatureId>();
    const result = propagate(model, modelManual);
    byModel.set(model.id, result);
    selection.set(model.id, result.selection);
  }

  return { byModel, selection };
}

function deriveExplanation(model: FeatureModel, featureId: FeatureId): Explanation {
  const feature = model.features[featureId];
  if (feature.edge === 'mandatory') {
    return explain({
      code: 'D_MANDATORY_CHILD',
      detail: `"${feature.name}" is mandatory once its parent is selected.`,
      involves: [ref(model.id, featureId)],
    });
  }
  if (feature.groupId !== undefined) {
    return explain({
      code: 'D_XOR_LAST_REMAINING',
      detail: `"${feature.name}" is the only choice left in its group given the current selection.`,
      involves: [ref(model.id, featureId)],
    });
  }
  return explain({
    code: 'D_CONSTRAINT_IMPLIES',
    detail: `"${feature.name}" is required by the current selection.`,
    involves: [ref(model.id, featureId)],
  });
}

/**
 * Approximation used only when full enumeration is truncated: ancestor
 * closure, mandatory-descendant closure, and forced `implies` targets,
 * repeated to a fixpoint. Marked complete: false so the UI can say the
 * propagation shown may be partial.
 */
function unitPropagateFallback(model: FeatureModel, manual: ReadonlySet<FeatureId>): ModelPropagation {
  const sel = withRoot(model, manual);
  let changed = true;

  while (changed) {
    changed = false;

    for (const featureId of model.featureOrder) {
      if (!sel.has(featureId)) continue;
      const feature = model.features[featureId];

      if (feature.parentId !== null && !sel.has(feature.parentId)) {
        sel.add(feature.parentId);
        changed = true;
      }
      for (const childId of feature.childIds) {
        const child = model.features[childId];
        if (child.edge === 'mandatory' && !sel.has(childId)) {
          sel.add(childId);
          changed = true;
        }
      }
    }

    for (const constraint of model.constraints) {
      if (constraint.kind === 'implies' && sel.has(constraint.source) && !sel.has(constraint.target)) {
        sel.add(constraint.target);
        changed = true;
      }
    }
  }

  const derived = setMinus(sel, manual);
  return {
    modelId: model.id,
    manual,
    selection: sel,
    derived,
    dead: new Set(),
    consistent: true,
    complete: false,
    explanations: [...derived].map((id) => deriveExplanation(model, id)),
  };
}
