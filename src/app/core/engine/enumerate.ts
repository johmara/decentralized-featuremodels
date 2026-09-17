import type { FeatureGroup, FeatureId, FeatureModel, GroupId } from '../model/feature-model.types';

export interface EnumerateOptions {
  readonly maxStates?: number;
}

export interface EnumerateResult {
  readonly configs: readonly ReadonlySet<FeatureId>[];
  /** False if the enumeration was truncated by maxStates before exploring the full space. */
  readonly complete: boolean;
}

const DEFAULT_MAX_STATES = 200_000;

type DecisionNode =
  | { readonly kind: 'feature'; readonly featureId: FeatureId }
  | { readonly kind: 'group'; readonly group: FeatureGroup };

/**
 * All locally valid configurations of a single model, depth-first over the
 * tree with group cardinalities enforced at each group. Bails to
 * `complete: false` above maxStates rather than exhausting memory — models
 * in this app stay under ~30 features, so this is a safety valve, not the
 * common path.
 */
export function enumerateLocal(model: FeatureModel, opts: EnumerateOptions = {}): EnumerateResult {
  const maxStates = opts.maxStates ?? DEFAULT_MAX_STATES;
  const nodes = buildDecisionNodes(model);
  const configs: Array<ReadonlySet<FeatureId>> = [];
  let bailed = false;

  function record(current: ReadonlySet<FeatureId>): void {
    if (bailed) return;
    if (satisfiesConstraints(model, current)) {
      configs.push(new Set(current));
      if (configs.length > maxStates) bailed = true;
    }
  }

  function backtrack(index: number, current: Set<FeatureId>): void {
    if (bailed) return;
    if (index === nodes.length) {
      record(current);
      return;
    }

    const node = nodes[index];

    if (node.kind === 'feature') {
      const feature = model.features[node.featureId];
      const parentSelected = feature.parentId === null || current.has(feature.parentId);

      if (!parentSelected) {
        backtrack(index + 1, current);
        return;
      }

      if (feature.edge === 'mandatory') {
        current.add(node.featureId);
        backtrack(index + 1, current);
        current.delete(node.featureId);
        return;
      }

      // Optional: try excluded, then included.
      backtrack(index + 1, current);
      if (bailed) return;
      current.add(node.featureId);
      backtrack(index + 1, current);
      current.delete(node.featureId);
      return;
    }

    // Group: enforce cardinality once for the whole group.
    const { group } = node;
    if (!current.has(group.parentId)) {
      backtrack(index + 1, current);
      return;
    }

    const subsets =
      group.kind === 'xor'
        ? group.memberIds.map((memberId) => [memberId])
        : nonEmptySubsets(group.memberIds);

    for (const subset of subsets) {
      if (bailed) return;
      for (const memberId of subset) current.add(memberId);
      backtrack(index + 1, current);
      for (const memberId of subset) current.delete(memberId);
    }
  }

  backtrack(0, new Set([model.rootId]));
  return { configs, complete: !bailed };
}

function nonEmptySubsets(items: readonly FeatureId[]): FeatureId[][] {
  const subsets: FeatureId[][] = [];
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: FeatureId[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(items[i]);
    }
    subsets.push(subset);
  }
  return subsets;
}

function satisfiesConstraints(model: FeatureModel, sel: ReadonlySet<FeatureId>): boolean {
  for (const constraint of model.constraints) {
    const sourceSelected = sel.has(constraint.source);
    if (!sourceSelected) continue;

    if (constraint.kind === 'implies') {
      if (!sel.has(constraint.target)) return false;
    } else if (constraint.kind === 'excludes') {
      if (sel.has(constraint.target)) return false;
    } else if (!constraint.targets.some((id) => sel.has(id))) {
      return false;
    }
  }
  return true;
}

/**
 * Parent-before-child decision order (BFS from root). Grouped features are
 * collapsed into a single decision node the first time any of their group's
 * members is encountered, so the group's cardinality is decided once, and
 * always before any of its members' own children.
 */
function buildDecisionNodes(model: FeatureModel): DecisionNode[] {
  const nodes: DecisionNode[] = [];
  const processedGroups = new Set<GroupId>();
  const root = model.features[model.rootId];
  const queue: FeatureId[] = [...root.childIds];

  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    const feature = model.features[id];

    if (feature.groupId !== undefined) {
      if (!processedGroups.has(feature.groupId)) {
        processedGroups.add(feature.groupId);
        nodes.push({ kind: 'group', group: model.groups[feature.groupId] });
      }
    } else {
      nodes.push({ kind: 'feature', featureId: id });
    }

    queue.push(...feature.childIds);
  }

  return nodes;
}
