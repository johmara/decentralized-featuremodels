import type { FeatureGroup, FeatureId, FeatureModel, GroupId } from '../model/feature-model.types';
import { measureLabel, type NodeMetrics } from './text-measure';

export interface PositionedNode {
  readonly featureId: FeatureId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TreeEdge {
  readonly parent: FeatureId;
  readonly child: FeatureId;
}

export interface GroupArcSpec {
  readonly groupId: GroupId;
  readonly kind: 'or' | 'xor';
  readonly parent: PositionedNode;
  readonly members: readonly PositionedNode[];
}

export interface TreeLayout {
  readonly nodes: ReadonlyMap<FeatureId, PositionedNode>;
  readonly edges: readonly TreeEdge[];
  readonly groupArcs: readonly GroupArcSpec[];
  readonly bounds: { readonly width: number; readonly height: number };
}

export interface LayoutOptions {
  readonly rowHeight?: number;
  readonly hGap?: number;
  readonly getMetrics?: (featureId: FeatureId, label: string) => NodeMetrics;
}

const DEFAULT_ROW_HEIGHT = 84;
const DEFAULT_H_GAP = 20;

/**
 * A simple centered bottom-up tree layout: each subtree's width is the sum
 * of its children's subtree widths (with gaps), and every parent centers
 * over the span of its own children. This guarantees no overlap by
 * construction — sibling subtrees are laid out in disjoint horizontal
 * bands — at the cost of being less compact than a true Reingold–Tilford
 * contour algorithm. For trees this shallow (≤4 levels, ≤6 children per
 * node) the difference is not visible; the simpler algorithm is easier to
 * keep correct and to snapshot-test.
 */
export function layoutTree(model: FeatureModel, options: LayoutOptions = {}): TreeLayout {
  const rowHeight = options.rowHeight ?? DEFAULT_ROW_HEIGHT;
  const hGap = options.hGap ?? DEFAULT_H_GAP;
  const getMetrics = options.getMetrics ?? ((_id: FeatureId, label: string) => measureLabel(label));

  const metricsCache = new Map<FeatureId, NodeMetrics>();
  function metricsOf(id: FeatureId): NodeMetrics {
    let m = metricsCache.get(id);
    if (!m) {
      m = getMetrics(id, model.features[id].name);
      metricsCache.set(id, m);
    }
    return m;
  }

  const widthCache = new Map<FeatureId, number>();
  function subtreeWidth(id: FeatureId): number {
    const cached = widthCache.get(id);
    if (cached !== undefined) return cached;

    const feature = model.features[id];
    const own = metricsOf(id).width;
    const width =
      feature.childIds.length === 0
        ? own
        : Math.max(
            own,
            feature.childIds.reduce((sum, childId, i) => sum + subtreeWidth(childId) + (i > 0 ? hGap : 0), 0),
          );

    widthCache.set(id, width);
    return width;
  }

  const positions = new Map<FeatureId, { x: number; y: number }>();

  function place(id: FeatureId, leftEdge: number, depth: number): void {
    const feature = model.features[id];
    const y = depth * rowHeight;

    if (feature.childIds.length === 0) {
      positions.set(id, { x: leftEdge + subtreeWidth(id) / 2, y });
      return;
    }

    let cursor = leftEdge;
    const childCenters: number[] = [];
    for (const childId of feature.childIds) {
      place(childId, cursor, depth + 1);
      const childCenter = positions.get(childId);
      childCenters.push(childCenter ? childCenter.x : cursor);
      cursor += subtreeWidth(childId) + hGap;
    }

    const first = childCenters[0];
    const last = childCenters[childCenters.length - 1];
    positions.set(id, { x: (first + last) / 2, y });
  }

  place(model.rootId, 0, 0);

  const nodes = new Map<FeatureId, PositionedNode>();
  for (const id of model.featureOrder) {
    const pos = positions.get(id);
    if (!pos) continue;
    const metrics = metricsOf(id);
    nodes.set(id, { featureId: id, x: pos.x, y: pos.y, width: metrics.width, height: metrics.height });
  }

  const edges: TreeEdge[] = [];
  for (const id of model.featureOrder) {
    const feature = model.features[id];
    if (feature.parentId !== null) edges.push({ parent: feature.parentId, child: id });
  }

  const groupArcs: GroupArcSpec[] = [];
  for (const group of Object.values(model.groups as Record<GroupId, FeatureGroup>)) {
    const parent = nodes.get(group.parentId);
    if (!parent) continue;
    const members = group.memberIds
      .map((memberId) => nodes.get(memberId))
      .filter((node): node is PositionedNode => node !== undefined);
    groupArcs.push({ groupId: group.id, kind: group.kind, parent, members });
  }

  let maxX = 0;
  let maxY = 0;
  for (const node of nodes.values()) {
    maxX = Math.max(maxX, node.x + node.width / 2);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return { nodes, edges, groupArcs, bounds: { width: maxX, height: maxY } };
}
