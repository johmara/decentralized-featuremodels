import type {
  Capability,
  CapabilityId,
  Example,
  Feature,
  FeatureId,
  FeatureModel,
  GroupId,
  ModelId,
} from '../model/feature-model.types';

/** Thrown by every edit command below on an invalid request — caught and shown as a message, never a crash. */
export class SandboxEditError extends Error {}

export function emptySandboxExample(): Example {
  return {
    id: 'sandbox',
    title: 'Sandbox',
    blurb: 'Build your own decentralized feature model from scratch.',
    models: [],
    capabilities: [],
    globalRules: [],
    assetTree: { path: '/', kind: 'repo', children: [] },
    presets: [],
  };
}

export interface AddScopeInput {
  readonly id: ModelId;
  readonly name: string;
  readonly assetPath: string;
  readonly ownerLabel: string;
  readonly colorToken: string;
}

export function addScope(example: Example, input: AddScopeInput): Example {
  if (!/^[a-zA-Z0-9._-]+$/.test(input.id)) {
    throw new SandboxEditError('Scope id may only contain letters, digits, "." "_" "-".');
  }
  if (example.models.some((model) => model.id === input.id)) {
    throw new SandboxEditError(`Scope "${input.id}" already exists.`);
  }

  const rootFeature: Feature = { id: 'Root', name: input.name, parentId: null, edge: 'mandatory', childIds: [] };
  const model: FeatureModel = {
    id: input.id,
    name: input.name,
    rootId: 'Root',
    features: { Root: rootFeature },
    groups: {},
    constraints: [],
    scope: {
      assetPath: input.assetPath,
      assetKind: 'folder',
      modelFileName: `${input.id}.fm`,
      ownerLabel: input.ownerLabel,
      colorToken: input.colorToken,
    },
    featureOrder: ['Root'],
  };

  return { ...example, models: [...example.models, model] };
}

export function removeScope(example: Example, modelId: ModelId): Example {
  mustGetModel(example, modelId);
  return { ...example, models: example.models.filter((model) => model.id !== modelId) };
}

export type FeatureKind = 'mandatory' | 'optional' | 'or' | 'xor';

export interface AddFeatureInput {
  readonly id: FeatureId;
  readonly name: string;
  readonly parentId: FeatureId;
  readonly kind: FeatureKind;
  readonly requires?: readonly CapabilityId[];
  readonly provides?: readonly CapabilityId[];
}

export function addFeature(example: Example, modelId: ModelId, input: AddFeatureInput): Example {
  const model = mustGetModel(example, modelId);
  if (!/^[a-zA-Z0-9_-]+$/.test(input.id)) {
    throw new SandboxEditError('Feature id may only contain letters, digits, "_" "-".');
  }
  if (model.features[input.id]) {
    throw new SandboxEditError(`Feature "${input.id}" already exists in this scope.`);
  }
  const parent = model.features[input.parentId];
  if (!parent) {
    throw new SandboxEditError(`Parent "${input.parentId}" does not exist in this scope.`);
  }

  let groups = model.groups;
  let groupId: GroupId | undefined;
  const edge = input.kind === 'or' || input.kind === 'xor' ? 'grouped' : input.kind;

  if (edge === 'grouped') {
    const kind = input.kind as 'or' | 'xor';
    groupId = `${input.parentId}::${kind}`;
    const existing = groups[groupId];
    groups = {
      ...groups,
      [groupId]: existing
        ? { ...existing, memberIds: [...existing.memberIds, input.id] }
        : { id: groupId, parentId: input.parentId, kind, memberIds: [input.id] },
    };
  }

  const feature: Feature = {
    id: input.id,
    name: input.name,
    parentId: input.parentId,
    edge,
    groupId,
    childIds: [],
    requires: input.requires,
    provides: input.provides,
  };

  const features = {
    ...model.features,
    [input.id]: feature,
    [input.parentId]: { ...parent, childIds: [...parent.childIds, input.id] },
  };

  return replaceModel(example, {
    ...model,
    features,
    groups,
    featureOrder: [...model.featureOrder, input.id],
  });
}

export function removeFeature(example: Example, modelId: ModelId, featureId: FeatureId): Example {
  const model = mustGetModel(example, modelId);
  const feature = model.features[featureId];
  if (!feature) throw new SandboxEditError(`Feature "${featureId}" does not exist in this scope.`);
  if (featureId === model.rootId) {
    throw new SandboxEditError('Cannot remove the root feature — remove the whole scope instead.');
  }
  if (feature.childIds.length > 0) {
    throw new SandboxEditError('Remove this feature’s children first.');
  }

  const features = { ...model.features };
  delete features[featureId];

  if (feature.parentId !== null) {
    const parent = features[feature.parentId];
    features[feature.parentId] = { ...parent, childIds: parent.childIds.filter((id) => id !== featureId) };
  }

  const groups = withoutGroupMember(model.groups, feature);

  const constraints = model.constraints.filter((constraint) => {
    if (constraint.source === featureId) return false;
    return constraint.kind === 'requiresAny'
      ? !constraint.targets.includes(featureId)
      : constraint.target !== featureId;
  });

  return replaceModel(example, {
    ...model,
    features,
    groups,
    constraints,
    featureOrder: model.featureOrder.filter((id) => id !== featureId),
  });
}

export function setFeatureCapabilities(
  example: Example,
  modelId: ModelId,
  featureId: FeatureId,
  kind: 'requires' | 'provides',
  capabilityIds: readonly CapabilityId[],
): Example {
  const model = mustGetModel(example, modelId);
  const feature = model.features[featureId];
  if (!feature) throw new SandboxEditError(`Feature "${featureId}" does not exist in this scope.`);

  const updated: Feature = { ...feature, [kind]: capabilityIds };
  return replaceModel(example, { ...model, features: { ...model.features, [featureId]: updated } });
}

export function addCapability(example: Example, input: Capability): Example {
  if (!/^[a-zA-Z0-9_-]+$/.test(input.id)) {
    throw new SandboxEditError('Capability id may only contain letters, digits, "_" "-".');
  }
  if (example.capabilities.some((capability) => capability.id === input.id)) {
    throw new SandboxEditError(`Capability "${input.id}" already exists.`);
  }
  return { ...example, capabilities: [...example.capabilities, input] };
}

export function removeCapability(example: Example, capabilityId: CapabilityId): Example {
  return { ...example, capabilities: example.capabilities.filter((capability) => capability.id !== capabilityId) };
}

export function addMutexRule(example: Example, a: CapabilityId, b: CapabilityId, rationale: string): Example {
  if (a === b) throw new SandboxEditError('A capability cannot be mutually exclusive with itself.');
  return { ...example, globalRules: [...example.globalRules, { kind: 'capability-mutex', a, b, rationale }] };
}

export function removeGlobalRule(example: Example, index: number): Example {
  return { ...example, globalRules: example.globalRules.filter((_, i) => i !== index) };
}

/** Renames a feature. The id is unchanged, so selections and capability wiring survive. */
export function renameFeature(example: Example, modelId: ModelId, featureId: FeatureId, name: string): Example {
  const model = mustGetModel(example, modelId);
  const feature = model.features[featureId];
  if (!feature) throw new SandboxEditError(`Feature "${featureId}" does not exist in this scope.`);
  const trimmed = name.trim();
  if (!trimmed) throw new SandboxEditError('A feature needs a name.');
  return replaceModel(example, { ...model, features: { ...model.features, [featureId]: { ...feature, name: trimmed } } });
}

/** Moves a non-root feature between mandatory, optional, and OR/XOR group membership under its current parent. */
export function setFeatureKind(example: Example, modelId: ModelId, featureId: FeatureId, kind: FeatureKind): Example {
  const model = mustGetModel(example, modelId);
  const feature = model.features[featureId];
  if (!feature) throw new SandboxEditError(`Feature "${featureId}" does not exist in this scope.`);
  if (feature.parentId === null) throw new SandboxEditError('The root feature has no edge to change.');

  let groups = withoutGroupMember(model.groups, feature);
  let updated: Feature;
  if (kind === 'or' || kind === 'xor') {
    const groupId = `${feature.parentId}::${kind}`;
    const existing = groups[groupId];
    groups = {
      ...groups,
      [groupId]: existing
        ? { ...existing, memberIds: [...existing.memberIds, featureId] }
        : { id: groupId, parentId: feature.parentId, kind, memberIds: [featureId] },
    };
    updated = { ...feature, edge: 'grouped', groupId };
  } else {
    const { groupId: _dropped, ...rest } = feature;
    updated = { ...rest, edge: kind };
  }

  return replaceModel(example, { ...model, groups, features: { ...model.features, [featureId]: updated } });
}

export function renameScope(example: Example, modelId: ModelId, name: string): Example {
  const model = mustGetModel(example, modelId);
  const trimmed = name.trim();
  if (!trimmed) throw new SandboxEditError('A scope needs a name.');
  return replaceModel(example, { ...model, name: trimmed });
}

/** The kind a feature currently has, in the vocabulary {@link addFeature} and {@link setFeatureKind} take. */
export function featureKindOf(model: FeatureModel, featureId: FeatureId): FeatureKind {
  const feature = model.features[featureId];
  if (feature.edge !== 'grouped') return feature.edge;
  return (feature.groupId && model.groups[feature.groupId]?.kind) || 'or';
}

/** "Order emails" -> "OrderEmails"; falls back to `fallback` when nothing usable is left. */
function pascalCase(name: string, fallback: string): string {
  const words = name.match(/[a-zA-Z0-9]+/g) ?? [];
  const joined = words.map((word) => word[0].toUpperCase() + word.slice(1)).join('');
  return joined || fallback;
}

function withSuffix(base: string, taken: (id: string) => boolean): string {
  if (!taken(base)) return base;
  let n = 2;
  while (taken(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/** A fresh feature id derived from a display name, unique within the model. */
export function suggestFeatureId(model: FeatureModel, name: string): FeatureId {
  return withSuffix(pascalCase(name, 'Feature'), (id) => id in model.features);
}

/** A fresh scope id derived from a display name — lower-kebab, unique within the example. */
export function suggestScopeId(example: Example, name: string): ModelId {
  const base = (name.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-') || 'scope';
  return withSuffix(base, (id) => example.models.some((model) => model.id === id));
}

/** A fresh capability id derived from a display name, unique within the example. */
export function suggestCapabilityId(example: Example, name: string): CapabilityId {
  return withSuffix(pascalCase(name, 'Capability'), (id) => example.capabilities.some((c) => c.id === id));
}

function withoutGroupMember(groups: FeatureModel['groups'], feature: Feature): FeatureModel['groups'] {
  if (!feature.groupId) return groups;
  const group = groups[feature.groupId];
  if (!group) return groups;
  const memberIds = group.memberIds.filter((id) => id !== feature.id);
  if (memberIds.length > 0) return { ...groups, [feature.groupId]: { ...group, memberIds } };
  const { [feature.groupId]: _removed, ...rest } = groups;
  return rest;
}

function mustGetModel(example: Example, modelId: ModelId): FeatureModel {
  const model = example.models.find((m) => m.id === modelId);
  if (!model) throw new SandboxEditError(`Scope "${modelId}" does not exist.`);
  return model;
}

function replaceModel(example: Example, updated: FeatureModel): Example {
  return { ...example, models: example.models.map((model) => (model.id === updated.id ? updated : model)) };
}
