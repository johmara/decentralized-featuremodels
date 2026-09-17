import type { PositionedNode } from './tidy-tree';

export interface ArcSpec {
  readonly d: string;
  readonly filled: boolean;
}

const ARC_RADIUS = 22;

/**
 * Group arc anchored at the parent's bottom-center, spanning the angle
 * between its first and last member. OR groups render as a filled pie
 * wedge (the legend's "filled arc"); XOR groups render as a bare stroked
 * arc (the legend's "hollow arc") — no radii, so it reads distinctly from
 * OR at a glance.
 */
export function computeGroupArc(
  parent: PositionedNode,
  members: readonly PositionedNode[],
  kind: 'or' | 'xor',
): ArcSpec | null {
  if (members.length === 0) return null;

  const anchorX = parent.x;
  const anchorY = parent.y + parent.height / 2;

  const angles = members.map((member) =>
    Math.atan2(member.y - member.height / 2 - anchorY, member.x - anchorX),
  );
  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);

  const start = polarPoint(anchorX, anchorY, ARC_RADIUS, minAngle);
  const end = polarPoint(anchorX, anchorY, ARC_RADIUS, maxAngle);

  if (kind === 'or') {
    return {
      d: `M ${anchorX} ${anchorY} L ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${end.x} ${end.y} Z`,
      filled: true,
    };
  }

  return {
    d: `M ${start.x} ${start.y} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 1 ${end.x} ${end.y}`,
    filled: false,
  };
}

function polarPoint(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
