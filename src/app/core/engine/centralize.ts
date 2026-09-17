import type {
  Constraint,
  Example,
  Feature,
  FeatureGroup,
  FeatureId,
  FeatureModel,
  GroupId,
  ModelId,
  Scope,
} from '../model/feature-model.types';
import { featureKey, ref } from '../model/feature-model.types';

const CENTRALIZED_ROOT_ID = '__centralized_root__';

const SYNTHETIC_SCOPE: Scope = {
  assetPath: '(synthetic — reconstructed for comparison only)',
  assetKind: 'repo',
  modelFileName: '(none — this model is not actually maintained anywhere)',
  ownerLabel: 'Nobody — this is the monolith decentralization avoids materializing',
  colorToken: '--surface-muted',
};

/**
 * Flattens a decentralized {@link Example} into the monolithic equivalent a
 * traditional single-model technique would need to maintain: one synthetic
 * root over every model's subtree, each `Requires(c)` expanded into the
 * provider disjunction `c ⇒ (p₁ ∨ … ∨ pₖ)`, and each capability-mutex rule
 * expanded into a plain `excludes` between two concrete features (when the
 * mutex names exactly one provider per side — otherwise left as a
 * `requiresAny`-shaped note, since a true global mutex over sets of
 * providers has no single pairwise encoding).
 *
 * This function has two jobs: it powers the "what would the monolith look
 * like" comparison view, and — because {@link enumerateLocal} +
 * {@link checkLocal} over its output must agree with
 * {@link resolveGlobal} over the original decentralized example — it is the
 * test oracle that proves the two are equivalent.
 */
export function centralize(example: Example): FeatureModel {
  const features: Record<FeatureId, Feature> = {};
  const groups: Record<GroupId, FeatureGroup> = {};
  const constraints: Constraint[] = [];
  const featureOrder: FeatureId[] = [CENTRALIZED_ROOT_ID];
  const rootChildIds: FeatureId[] = [];

  for (const model of example.models) {
    for (const featureId of model.featureOrder) {
      const feature = model.features[featureId];
      const globalId = featureKey(ref(model.id, featureId));
      const isModelRoot = feature.parentId === null;
      const parentGlobalId = isModelRoot
        ? CENTRALIZED_ROOT_ID
        : featureKey(ref(model.id, feature.parentId as FeatureId));

      features[globalId] = {
        id: globalId,
        name: `${model.name} / ${feature.name}`,
        parentId: parentGlobalId,
        childIds: feature.childIds.map((childId) => featureKey(ref(model.id, childId))),
        edge: isModelRoot ? 'mandatory' : feature.edge,
        groupId: feature.groupId ? globalGroupId(model.id, feature.groupId) : undefined,
      };
      featureOrder.push(globalId);
      if (isModelRoot) rootChildIds.push(globalId);
    }

    for (const group of Object.values(model.groups)) {
      const id = globalGroupId(model.id, group.id);
      groups[id] = {
        id,
        parentId: featureKey(ref(model.id, group.parentId)),
        kind: group.kind,
        memberIds: group.memberIds.map((memberId) => featureKey(ref(model.id, memberId))),
      };
    }

    for (const constraint of model.constraints) {
      constraints.push(globalizeConstraint(model.id, constraint));
    }
  }

  features[CENTRALIZED_ROOT_ID] = {
    id: CENTRALIZED_ROOT_ID,
    name: example.title,
    parentId: null,
    childIds: rootChildIds,
    edge: 'mandatory',
  };

  // Requires(c) ⇒ c ⇒ (p₁ ∨ … ∨ pₖ): for every feature that requires a
  // capability, add one requiresAny constraint whose targets are every
  // feature anywhere in the example that provides that capability.
  const providersByCapability = new Map<string, FeatureId[]>();
  for (const model of example.models) {
    for (const featureId of model.featureOrder) {
      const feature = model.features[featureId];
      for (const capabilityId of feature.provides ?? []) {
        const globalId = featureKey(ref(model.id, featureId));
        const list = providersByCapability.get(capabilityId);
        if (list) list.push(globalId);
        else providersByCapability.set(capabilityId, [globalId]);
      }
    }
  }

  let requiresCounter = 0;
  for (const model of example.models) {
    for (const featureId of model.featureOrder) {
      const feature = model.features[featureId];
      for (const capabilityId of feature.requires ?? []) {
        const targets = providersByCapability.get(capabilityId) ?? [];
        constraints.push({
          id: `__cap_${capabilityId}_${requiresCounter++}`,
          kind: 'requiresAny',
          source: featureKey(ref(model.id, featureId)),
          targets,
          rationale: `Capability "${capabilityId}" — flattened from a cross-model Requires/Provides contract.`,
        });
      }
    }
  }

  // Capability mutex rules with exactly one provider per side collapse to a
  // plain excludes edge. Rules with multiple providers per side have no
  // single pairwise encoding and are intentionally omitted here — they are
  // exactly the case the comparison view uses to show where flattening
  // stops being straightforward.
  let mutexCounter = 0;
  for (const rule of example.globalRules) {
    if (rule.kind !== 'capability-mutex') continue;
    const aProviders = providersByCapability.get(rule.a) ?? [];
    const bProviders = providersByCapability.get(rule.b) ?? [];
    if (aProviders.length === 1 && bProviders.length === 1) {
      constraints.push({
        id: `__mutex_${mutexCounter++}`,
        kind: 'excludes',
        source: aProviders[0],
        target: bProviders[0],
        rationale: rule.rationale,
      });
    }
  }

  return {
    id: `${example.id}.centralized`,
    name: `${example.title} (centralized)`,
    rootId: CENTRALIZED_ROOT_ID,
    features,
    groups,
    constraints,
    scope: SYNTHETIC_SCOPE,
    featureOrder,
  };
}

function globalGroupId(modelId: ModelId, groupId: GroupId): GroupId {
  return `${modelId}::${groupId}`;
}

function globalizeConstraint(modelId: ModelId, constraint: Constraint): Constraint {
  if (constraint.kind === 'requiresAny') {
    return {
      id: `${modelId}::${constraint.id}`,
      kind: 'requiresAny',
      source: featureKey(ref(modelId, constraint.source)),
      targets: constraint.targets.map((id) => featureKey(ref(modelId, id))),
      rationale: constraint.rationale,
    };
  }
  return {
    id: `${modelId}::${constraint.id}`,
    kind: constraint.kind,
    source: featureKey(ref(modelId, constraint.source)),
    target: featureKey(ref(modelId, constraint.target)),
    rationale: constraint.rationale,
  };
}
