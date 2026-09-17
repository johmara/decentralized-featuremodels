/**
 * Core domain types for feature models, decentralized feature models, and
 * capability-based cross-model constraints.
 *
 * Grounded in "Towards Decentralized Feature Models" (Mukelabai, Martinson,
 * Mahmood, Berger, Capilla — Variability 2026). See docs/paper-mapping.md
 * for the mapping from these types to the paper's definitions and formulas.
 */

/** Identifies one decentralized feature model within an {@link Example}, e.g. 'phone.messaging'. */
export type ModelId = string;

/** Identifies a feature within a single model. Only unique *within* that model. */
export type FeatureId = string;

/** Identifies a capability in the example's shared capability catalog. */
export type CapabilityId = string;

/** A feature, fully qualified by the model that owns it. */
export interface FeatureRef {
  readonly modelId: ModelId;
  readonly featureId: FeatureId;
}

export function featureKey(ref: FeatureRef): string {
  return `${ref.modelId}::${ref.featureId}`;
}

export function ref(modelId: ModelId, featureId: FeatureId): FeatureRef {
  return { modelId, featureId };
}

/** The FODA decoration on the edge from a feature to its parent. */
export type EdgeKind = 'mandatory' | 'optional' | 'grouped';

export type GroupId = string;

/** An OR (1..n) or XOR/alternative (exactly 1) group of sibling features. */
export interface FeatureGroup {
  readonly id: GroupId;
  readonly parentId: FeatureId;
  readonly kind: 'or' | 'xor';
  readonly memberIds: readonly FeatureId[];
}

/**
 * A cross-tree constraint. LOCAL to one model — never references a feature
 * in another model. This is the structural invariant behind the paper's
 * claim that "only capability clauses cross model boundaries."
 *
 * `requiresAny` is the general form `source ⇒ (targets[0] ∨ … ∨ targets[n])`.
 * Example data only ever authors `implies`/`excludes` (a single target);
 * `requiresAny` exists so {@link centralize} can encode a capability's
 * provider disjunction `c ⇒ (p₁ ∨ … ∨ pₖ)` as a plain constraint once the
 * capability layer is flattened away.
 */
export type Constraint =
  | { readonly id: string; readonly kind: 'implies'; readonly source: FeatureId; readonly target: FeatureId; readonly rationale?: string }
  | { readonly id: string; readonly kind: 'excludes'; readonly source: FeatureId; readonly target: FeatureId; readonly rationale?: string }
  | { readonly id: string; readonly kind: 'requiresAny'; readonly source: FeatureId; readonly targets: readonly FeatureId[]; readonly rationale?: string };

/**
 * The paper's notion of scope, made data: "the part of the code base that
 * the feature model applies to... the collection of any and all assets
 * containing the complete or partial implementations of the features
 * comprised in the feature model."
 */
export interface Scope {
  readonly assetPath: string;
  readonly assetKind: 'repo' | 'folder' | 'file';
  readonly modelFileName: string;
  readonly ownerLabel: string;
  /** CSS custom property name carrying this scope's identity color, e.g. '--team-msg'. */
  readonly colorToken: string;
}

/** One decentralized (or, when standing alone, plain) feature model. */
export interface FeatureModel {
  readonly id: ModelId;
  readonly name: string;
  readonly rootId: FeatureId;
  readonly features: Readonly<Record<FeatureId, Feature>>;
  readonly groups: Readonly<Record<GroupId, FeatureGroup>>;
  readonly constraints: readonly Constraint[];
  readonly scope: Scope;
  /** Stable order over all feature ids — the basis for bitset URL encoding. */
  readonly featureOrder: readonly FeatureId[];
}

export interface Feature {
  readonly id: FeatureId;
  readonly name: string;
  readonly parentId: FeatureId | null;
  readonly childIds: readonly FeatureId[];
  readonly edge: EdgeKind;
  /** Set iff edge === 'grouped'. */
  readonly groupId?: GroupId;
  readonly requires?: readonly CapabilityId[];
  readonly provides?: readonly CapabilityId[];
  /** Illustrative asset paths this feature is implemented in — the scope story made concrete. */
  readonly assetPaths?: readonly string[];
  /** Teaching annotation shown in the inspector panel. */
  readonly note?: string;
}

export interface Capability {
  readonly id: CapabilityId;
  readonly name: string;
  readonly description: string;
  /** Hook for the capability-governance lesson (challenge C3). */
  readonly vocabularyNote?: string;
}

/** A rule that crosses model boundaries but is not itself a capability requirement. */
export type GlobalRule = {
  readonly kind: 'capability-mutex';
  readonly a: CapabilityId;
  readonly b: CapabilityId;
  readonly rationale: string;
};

export interface AssetNode {
  readonly path: string;
  readonly kind: 'repo' | 'folder' | 'file';
  readonly children: readonly AssetNode[];
  /** Set when a feature model is placed on this asset. */
  readonly modelId?: ModelId;
}

/** A named, curated selection used as a one-click teaching scenario. */
export interface ConfigPreset {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Manual selection per model id. */
  readonly selection: Readonly<Record<ModelId, readonly FeatureId[]>>;
}

export interface ComparisonRow {
  readonly technique: string;
  readonly globalFm: 'yes' | 'no' | 'partial';
  readonly independentModels: 'yes' | 'no' | 'partial';
  readonly assetScope: 'yes' | 'no' | 'partial';
  readonly distributedConfig: 'yes' | 'no' | 'partial';
  readonly note?: string;
}

export type ExampleId = string;

/** One of the site's worked examples: a set of decentralized models plus its centralized counterpart. */
export interface Example {
  readonly id: ExampleId;
  readonly title: string;
  readonly blurb: string;
  /** The monolithic equivalent shown first, before decomposition. Absent when the example has no natural monolith (e.g. the distro). */
  readonly centralized?: FeatureModel;
  readonly models: readonly FeatureModel[];
  readonly capabilities: readonly Capability[];
  readonly globalRules: readonly GlobalRule[];
  readonly assetTree: AssetNode;
  readonly presets: readonly ConfigPreset[];
  readonly comparisonNotes?: readonly ComparisonRow[];
}

/** Selection state: per model, the set of manually selected feature ids. Everything else is derived. */
export type Selection = ReadonlyMap<ModelId, ReadonlySet<FeatureId>>;

export const EMPTY_SELECTION: Selection = new Map();

export function modelById(example: Example, modelId: ModelId): FeatureModel {
  const model = example.models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Unknown model id "${modelId}" in example "${example.id}"`);
  }
  return model;
}

export function selectionFor(selection: Selection, modelId: ModelId): ReadonlySet<FeatureId> {
  return selection.get(modelId) ?? new Set();
}
