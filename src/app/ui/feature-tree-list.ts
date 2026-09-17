import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { ModelPropagation } from '../core/engine/propagate';
import type { Feature, FeatureId, FeatureModel } from '../core/model/feature-model.types';
import type { FeatureVisualState } from './feature-node';

/**
 * The honest screen-reader path for a feature tree: a plain nested
 * `<ul role="tree">` instead of the SVG canvas. Same data, same toggle
 * contract as FeatureTree — a toggleable alternative view, not a
 * second source of truth.
 */
@Component({
  selector: 'app-feature-tree-list',
  imports: [NgTemplateOutlet],
  templateUrl: './feature-tree-list.html',
  styleUrl: './feature-tree-list.scss',
})
export class FeatureTreeList {
  readonly model = input.required<FeatureModel>();
  readonly propagation = input.required<ModelPropagation>();
  readonly disabled = input(false);

  readonly toggle = output<FeatureId>();

  featureOf(id: FeatureId): Feature {
    return this.model().features[id];
  }

  childrenOf(id: FeatureId): readonly FeatureId[] {
    return this.featureOf(id).childIds;
  }

  hasChildren(id: FeatureId): boolean {
    return this.featureOf(id).childIds.length > 0;
  }

  isSelected(id: FeatureId): boolean {
    return this.propagation().selection.has(id);
  }

  stateOf(id: FeatureId): FeatureVisualState {
    const propagation = this.propagation();
    if (propagation.dead.has(id)) return 'dead';
    if (propagation.selection.has(id)) return propagation.derived.has(id) ? 'derived' : 'manual';
    return 'unselected';
  }

  stateLabel(id: FeatureId): string {
    switch (this.stateOf(id)) {
      case 'manual':
        return 'selected by you';
      case 'derived':
        return 'selected automatically';
      case 'dead':
        return 'impossible right now';
      default:
        return 'not selected';
    }
  }

  onActivate(id: FeatureId): void {
    if (this.disabled()) return;
    this.toggle.emit(id);
  }

  onKeydown(event: KeyboardEvent, id: FeatureId): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.onActivate(id);
    }
  }
}
