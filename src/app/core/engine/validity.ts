import type {
  Example,
  FeatureId,
  FeatureModel,
  ModelId,
} from '../model/feature-model.types';
import { ref } from '../model/feature-model.types';
import { explain, type Explanation } from './explain';
import { withRoot } from './set-utils';

export interface LocalValidity {
  readonly modelId: ModelId;
  readonly valid: boolean;
  readonly violations: readonly Explanation[];
}

/**
 * Tree semantics plus local cross-tree constraints, checked against ONE
 * model and that model's selection alone. This signature is the
 * decentralization invariant made literal — validity.ts never receives a
 * second model's data, so it structurally cannot leak state across scopes.
 */
export function checkLocal(model: FeatureModel, selection: ReadonlySet<FeatureId>): LocalValidity {
  const sel = withRoot(model, selection);
  const violations: Explanation[] = [];

  for (const featureId of model.featureOrder) {
    const feature = model.features[featureId];
    if (!sel.has(featureId)) continue;

    if (feature.parentId !== null && !sel.has(feature.parentId)) {
      const parent = model.features[feature.parentId];
      violations.push(
        explain({
          code: 'E_ORPHAN_CHILD',
          detail: `"${feature.name}" is selected, but its parent "${parent.name}" is not.`,
          involves: [ref(model.id, featureId), ref(model.id, feature.parentId)],
        }),
      );
      continue;
    }

    if (feature.edge === 'mandatory') {
      for (const childId of feature.childIds) {
        const child = model.features[childId];
        if (child.edge === 'mandatory' && !sel.has(childId)) {
          violations.push(
            explain({
              code: 'E_MANDATORY_UNSELECTED',
              detail: `"${child.name}" is mandatory under "${feature.name}" and must be selected.`,
              involves: [ref(model.id, childId), ref(model.id, featureId)],
            }),
          );
        }
      }
    }
  }

  for (const group of Object.values(model.groups)) {
    if (!sel.has(group.parentId)) continue; // members-selected-without-parent already reported as orphans
    const parentName = model.features[group.parentId].name;
    const memberNames = group.memberIds.map((id) => model.features[id].name).join(', ');
    const selectedMembers = group.memberIds.filter((id) => sel.has(id));

    if (group.kind === 'xor') {
      if (selectedMembers.length === 0) {
        violations.push(
          explain({
            code: 'E_XOR_NONE',
            detail: `Exactly one of {${memberNames}} must be selected under "${parentName}".`,
            involves: group.memberIds.map((id) => ref(model.id, id)),
          }),
        );
      } else if (selectedMembers.length > 1) {
        violations.push(
          explain({
            code: 'E_XOR_MULTIPLE',
            detail: `Only one of {${memberNames}} may be selected under "${parentName}", but ${selectedMembers.length} are.`,
            involves: selectedMembers.map((id) => ref(model.id, id)),
          }),
        );
      }
    } else if (selectedMembers.length === 0) {
      violations.push(
        explain({
          code: 'E_OR_NONE',
          detail: `At least one of {${memberNames}} must be selected under "${parentName}".`,
          involves: group.memberIds.map((id) => ref(model.id, id)),
        }),
      );
    }
  }

  for (const constraint of model.constraints) {
    const sourceSelected = sel.has(constraint.source);
    const sourceName = model.features[constraint.source].name;

    if (constraint.kind === 'implies') {
      const targetSelected = sel.has(constraint.target);
      if (sourceSelected && !targetSelected) {
        const targetName = model.features[constraint.target].name;
        violations.push(
          explain({
            code: 'E_CONSTRAINT_IMPLIES_VIOLATED',
            detail: `"${sourceName}" requires "${targetName}".${constraint.rationale ? ` ${constraint.rationale}` : ''}`,
            involves: [ref(model.id, constraint.source), ref(model.id, constraint.target)],
          }),
        );
      }
    } else if (constraint.kind === 'excludes') {
      const targetSelected = sel.has(constraint.target);
      if (sourceSelected && targetSelected) {
        const targetName = model.features[constraint.target].name;
        violations.push(
          explain({
            code: 'E_CONSTRAINT_EXCLUDES_VIOLATED',
            detail: `"${sourceName}" and "${targetName}" cannot both be selected.${constraint.rationale ? ` ${constraint.rationale}` : ''}`,
            involves: [ref(model.id, constraint.source), ref(model.id, constraint.target)],
          }),
        );
      }
    } else {
      const anySelected = constraint.targets.some((id) => sel.has(id));
      if (sourceSelected && !anySelected) {
        const targetNames = constraint.targets.map((id) => model.features[id].name).join(' or ');
        violations.push(
          explain({
            code: 'E_CONSTRAINT_IMPLIES_VIOLATED',
            detail: `"${sourceName}" requires one of {${targetNames}}.${constraint.rationale ? ` ${constraint.rationale}` : ''}`,
            involves: [ref(model.id, constraint.source), ...constraint.targets.map((id) => ref(model.id, id))],
          }),
        );
      }
    }
  }

  return { modelId: model.id, valid: violations.length === 0, violations };
}

export function checkAllLocal(
  example: Example,
  selection: ReadonlyMap<ModelId, ReadonlySet<FeatureId>>,
): ReadonlyMap<ModelId, LocalValidity> {
  const results = new Map<ModelId, LocalValidity>();
  for (const model of example.models) {
    results.set(model.id, checkLocal(model, selection.get(model.id) ?? new Set()));
  }
  return results;
}
