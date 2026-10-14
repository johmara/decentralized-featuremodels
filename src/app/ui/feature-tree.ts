import { Component, computed, input, output } from '@angular/core';
import { FeatureNode, type FeatureVisualState } from './feature-node';
import { layoutTree } from '../core/layout/tidy-tree';
import { computeGroupArc } from '../core/layout/arc-geometry';
import type { Feature, FeatureId, FeatureModel } from '../core/model/feature-model.types';
import type { ModelPropagation } from '../core/engine/propagate';

interface RenderedGroupArc {
  readonly groupId: string;
  readonly d: string;
  readonly filled: boolean;
}

interface RenderedEdge {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Renders one feature model as a tidy tree with FODA glyphs. Presentational — no store injection. */
@Component({
  selector: 'app-feature-tree',
  imports: [FeatureNode],
  templateUrl: './feature-tree.html',
  styleUrl: './feature-tree.scss',
})
export class FeatureTree {
  readonly model = input.required<FeatureModel>();
  readonly propagation = input.required<ModelPropagation>();
  readonly disabled = input(false);
  /**
   * Scale factor against the layout's natural size. Unset (null), the tree
   * shrinks to fit its container's width; set, it renders at a fixed pixel
   * size so a surrounding scroll container can pan over it.
   */
  readonly zoom = input<number | null>(null);

  readonly toggle = output<FeatureId>();

  readonly layout = computed(() => layoutTree(this.model()));

  private readonly pad = 32;

  readonly viewBox = computed(() => {
    const bounds = this.layout().bounds;
    return `${-this.pad} ${-this.pad} ${bounds.width + this.pad * 2} ${bounds.height + this.pad * 2}`;
  });

  /** Natural (zoom = 1) pixel size of the rendered SVG, padding included. */
  readonly naturalSize = computed(() => {
    const bounds = this.layout().bounds;
    return { width: bounds.width + this.pad * 2, height: bounds.height + this.pad * 2 };
  });

  readonly pixelWidth = computed(() => {
    const zoom = this.zoom();
    return zoom === null ? null : this.naturalSize().width * zoom;
  });

  readonly nodeIds = computed(() => this.model().featureOrder);

  readonly edges = computed<RenderedEdge[]>(() => {
    const layout = this.layout();
    const result: RenderedEdge[] = [];
    for (const edge of layout.edges) {
      const parent = layout.nodes.get(edge.parent);
      const child = layout.nodes.get(edge.child);
      if (!parent || !child) continue;
      result.push({
        key: `${edge.parent}->${edge.child}`,
        x1: parent.x,
        y1: parent.y + parent.height / 2,
        x2: child.x,
        y2: child.y,
      });
    }
    return result;
  });

  readonly groupArcs = computed<RenderedGroupArc[]>(() => {
    const result: RenderedGroupArc[] = [];
    for (const arc of this.layout().groupArcs) {
      const spec = computeGroupArc(arc.parent, arc.members, arc.kind);
      if (spec) result.push({ groupId: arc.groupId, d: spec.d, filled: spec.filled });
    }
    return result;
  });

  featureOf(id: FeatureId): Feature {
    return this.model().features[id];
  }

  nodeOf(id: FeatureId) {
    return this.layout().nodes.get(id);
  }

  stateOf(id: FeatureId): FeatureVisualState {
    const propagation = this.propagation();
    if (propagation.dead.has(id)) return 'dead';
    if (propagation.selection.has(id)) return propagation.derived.has(id) ? 'derived' : 'manual';
    return 'unselected';
  }

  onActivate(id: FeatureId): void {
    this.toggle.emit(id);
  }
}
