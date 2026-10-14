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
 * provider disjunction `c ⇒ (p₁ ∨ … ∨ pₖ)`, and each global rule expanded
 * into plain `excludes` / `requiresAny` constraints between concrete
 * provider features.
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

  // Every rule kind has an exact encoding:
  // - mutex: every provider of `a` excludes every provider of `b`;
  // - implies: every provider of `a` requires some provider of `b`;
  // - single-provider: its providers pairwise exclude each other.
  let ruleCounter = 0;
  for (const rule of example.globalRules) {
    if (rule.kind === 'capability-mutex') {
      for (const source of providersByCapability.get(rule.a) ?? []) {
        for (const target of providersByCapability.get(rule.b) ?? []) {
          constraints.push({ id: `__mutex_${ruleCounter++}`, kind: 'excludes', source, target, rationale: rule.rationale });
        }
      }
    } else if (rule.kind === 'capability-implies') {
      const bProviders = providersByCapability.get(rule.b) ?? [];
      for (const source of providersByCapability.get(rule.a) ?? []) {
        constraints.push({ id: `__implies_${ruleCounter++}`, kind: 'requiresAny', source, targets: bProviders, rationale: rule.rationale });
      }
    } else {
      const providers = providersByCapability.get(rule.capability) ?? [];
      for (let i = 0; i < providers.length; i++) {
        for (let j = i + 1; j < providers.length; j++) {
          constraints.push({ id: `__single_${ruleCounter++}`, kind: 'excludes', source: providers[i], target: providers[j], rationale: rule.rationale });
        }
      }
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
