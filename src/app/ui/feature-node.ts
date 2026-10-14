import { Component, computed, input, output } from '@angular/core';
import type { Feature } from '../core/model/feature-model.types';
import type { PositionedNode } from '../core/layout/tidy-tree';

export type FeatureVisualState = 'manual' | 'derived' | 'unselected' | 'dead';

/**
 * One feature box. Attribute-selector component (`[appFeatureNode]` on a
 * literal `<g>`) rather than a custom element tag — the host `<g>` is
 * written directly in the parent's SVG template, so it is created in the
 * SVG namespace by the parent's own markup; a custom tag name would not
 * be.
 */
@Component({
  selector: '[appFeatureNode]',
  templateUrl: './feature-node.html',
  styleUrl: './feature-node.scss',
  host: {
    class: 'node',
    role: 'button',
    tabindex: '0',
    '[attr.transform]': 'transform()',
    '[class.node--manual]': "state() === 'manual'",
    '[class.node--derived]': "state() === 'derived'",
    '[class.node--dead]': "state() === 'dead'",
    '[class.node--disabled]': 'disabled()',
    '[class.node--focused]': 'focused()',
    '[attr.aria-pressed]': "state() === 'manual' || state() === 'derived'",
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.aria-label]': 'feature().name',
    '(click)': 'onActivate()',
    '(dblclick)': 'edit.emit()',
    '(mouseenter)': 'hover.emit(true)',
    '(mouseleave)': 'hover.emit(false)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class FeatureNode {
  readonly feature = input.required<Feature>();
  readonly node = input.required<PositionedNode>();
  readonly state = input.required<FeatureVisualState>();
  readonly disabled = input(false);
  readonly focused = input(false);

  readonly activate = output<void>();
  /** Double-click — used by the sandbox to open the feature editor ("e" while hovering is handled by the tree). */
  readonly edit = output<void>();
  readonly hover = output<boolean>();

  readonly transform = computed(() => `translate(${this.node().x - this.node().width / 2}, ${this.node().y})`);
  readonly labelX = computed(() => this.node().width / 2);
  readonly labelY = computed(() => this.node().height / 2 + 4);
  readonly dotCx = computed(() => this.node().width / 2);

  /** Capability wiring, drawn as small labels under the box — the only links that cross scope boundaries. */
  readonly capabilityTags = computed(() => {
    const feature = this.feature();
    return [
      ...(feature.provides ?? []).map((id) => ({ key: `p:${id}`, text: `provides ${id}`, kind: 'provides' as const })),
      ...(feature.requires ?? []).map((id) => ({ key: `r:${id}`, text: `requires ${id}`, kind: 'requires' as const })),
    ].map((tag, i) => ({ ...tag, y: this.node().height + 13 + i * 12 }));
  });

  onActivate(): void {
    if (this.disabled()) return;
    this.activate.emit();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.onActivate();
    }
  }
}
