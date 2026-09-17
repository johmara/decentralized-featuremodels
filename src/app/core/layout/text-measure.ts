/**
 * Deterministic, dependency-free label sizing. Real canvas text metrics
 * would be more precise, but they're unavailable in the vitest/jsdom
 * environment without a native canvas dependency — and the whole point of
 * hand-rolling layout is to keep it testable without one. The pinned font
 * stack (styles.scss --font-sans) makes this heuristic stable in practice;
 * the layout snapshot test in tidy-tree.spec.ts fails loudly if it drifts.
 */

export interface NodeMetrics {
  readonly width: number;
  readonly height: number;
}

const AVERAGE_CHAR_WIDTH_PX = 7.1;
const PADDING_X = 24;
const NODE_HEIGHT = 34;
const MIN_WIDTH = 64;

const cache = new Map<string, NodeMetrics>();

export function measureLabel(label: string): NodeMetrics {
  const cached = cache.get(label);
  if (cached) return cached;

  const width = Math.max(MIN_WIDTH, Math.round(label.length * AVERAGE_CHAR_WIDTH_PX) + PADDING_X);
  const metrics: NodeMetrics = { width, height: NODE_HEIGHT };
  cache.set(label, metrics);
  return metrics;
}

/** For tests only — the production app never needs to reset this. */
export function clearMeasureCacheForTests(): void {
  cache.clear();
}
