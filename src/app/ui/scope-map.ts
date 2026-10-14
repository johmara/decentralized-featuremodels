import { Component, computed, input } from '@angular/core';
import type { CapabilityId, Example, ModelId } from '../core/model/feature-model.types';

interface MapBox {
  readonly id: ModelId;
  readonly name: string;
  readonly colorToken: string;
  readonly x: number;
  readonly y: number;
  readonly excluded: boolean;
}

interface MapEdge {
  readonly key: string;
  readonly d: string;
  readonly label: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly excluded: boolean;
}

interface Unprovided {
  readonly capability: CapabilityId;
  readonly requiredBy: readonly string[];
}

const BOX_W = 170;
const BOX_H = 40;
const COL_GAP = 160;
const ROW_GAP = 28;
const PAD = 12;
const MAX_NAME = 22;

/**
 * Scope-level overview of an example: one box per scope, one arrow per
 * requirer → provider pair, labeled with the capabilities that connect
 * them. Structural — it shows every declared requires/provides, whatever
 * is currently selected. Columns are longest-path layers, so requirers sit
 * left of what they depend on.
 */
@Component({
  selector: 'app-scope-map',
  templateUrl: './scope-map.html',
  styleUrl: './scope-map.scss',
})
export class ScopeMap {
  readonly example = input.required<Example>();
  readonly excludedModelIds = input<ReadonlySet<ModelId>>(new Set());

  private readonly wiring = computed(() => {
    const requires = new Map<ModelId, Set<CapabilityId>>();
    const providersOf = new Map<CapabilityId, Set<ModelId>>();
    for (const model of this.example().models) {
      const required = new Set<CapabilityId>();
      for (const feature of Object.values(model.features)) {
        for (const id of feature.requires ?? []) required.add(id);
        for (const id of feature.provides ?? []) {
          if (!providersOf.has(id)) providersOf.set(id, new Set());
          providersOf.get(id)!.add(model.id);
        }
      }
      requires.set(model.id, required);
    }
    return { requires, providersOf };
  });

  private readonly links = computed(() => {
    const { requires, providersOf } = this.wiring();
    const links = new Map<string, { from: ModelId; to: ModelId; caps: CapabilityId[] }>();
    for (const [from, required] of requires) {
      for (const capability of required) {
        for (const to of providersOf.get(capability) ?? []) {
          if (to === from) continue;
          const key = `${from}->${to}`;
          if (!links.has(key)) links.set(key, { from, to, caps: [] });
          links.get(key)!.caps.push(capability);
        }
      }
    }
    return [...links.values()];
  });

  private readonly layout = computed(() => {
    const models = this.example().models;
    const layer = new Map<ModelId, number>(models.map((m) => [m.id, 0]));
    // Longest-path layering, capped so a capability cycle cannot loop forever.
    for (let pass = 0; pass < models.length; pass++) {
      let changed = false;
      for (const link of this.links()) {
        const next = Math.min(models.length - 1, layer.get(link.from)! + 1);
        if (next > layer.get(link.to)!) {
          layer.set(link.to, next);
          changed = true;
        }
      }
      if (!changed) break;
    }
    const rowInColumn = new Map<number, number>();
    const positions = new Map<ModelId, { x: number; y: number }>();
    for (const model of models) {
      const column = layer.get(model.id)!;
      const row = rowInColumn.get(column) ?? 0;
      rowInColumn.set(column, row + 1);
      positions.set(model.id, { x: PAD + column * (BOX_W + COL_GAP), y: PAD + row * (BOX_H + ROW_GAP) });
    }
    const columns = Math.max(1, ...[...layer.values()].map((l) => l + 1));
    const rows = Math.max(1, ...rowInColumn.values());
    return {
      positions,
      width: PAD * 2 + columns * BOX_W + (columns - 1) * COL_GAP,
      height: PAD * 2 + rows * BOX_H + (rows - 1) * ROW_GAP,
    };
  });

  readonly viewBox = computed(() => `0 0 ${this.layout().width} ${this.layout().height}`);
  readonly width = computed(() => this.layout().width);

  readonly boxes = computed<MapBox[]>(() => {
    const excluded = this.excludedModelIds();
    return this.example().models.map((model) => {
      const p = this.layout().positions.get(model.id)!;
      const name = model.name.length > MAX_NAME ? `${model.name.slice(0, MAX_NAME - 1)}…` : model.name;
      return { id: model.id, name, colorToken: model.scope.colorToken, x: p.x, y: p.y, excluded: excluded.has(model.id) };
    });
  });

  readonly edges = computed<MapEdge[]>(() => {
    const excluded = this.excludedModelIds();
    const positions = this.layout().positions;
    return this.links().map((link) => {
      const a = positions.get(link.from)!;
      const b = positions.get(link.to)!;
      const forward = b.x > a.x;
      const x1 = forward ? a.x + BOX_W : a.x + BOX_W / 2;
      const y1 = forward ? a.y + BOX_H / 2 : a.y + BOX_H;
      const x2 = forward ? b.x : b.x + BOX_W / 2;
      const y2 = forward ? b.y + BOX_H / 2 : b.y;
      const bend = forward ? (x2 - x1) / 2 : 0;
      const d = forward
        ? `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`
        : `M${x1},${y1} C${x1 + 60},${(y1 + y2) / 2} ${x2 + 60},${(y1 + y2) / 2} ${x2},${y2}`;
      return {
        key: `${link.from}->${link.to}`,
        d,
        label: link.caps.join(', '),
        labelX: forward ? (x1 + x2) / 2 : Math.max(x1, x2) + 48,
        labelY: (y1 + y2) / 2 - 4,
        excluded: excluded.has(link.from) || excluded.has(link.to),
      };
    });
  });

  /** Capabilities some active scope requires that no active scope provides, at all. */
  readonly unprovided = computed<Unprovided[]>(() => {
    const excluded = this.excludedModelIds();
    const { requires, providersOf } = this.wiring();
    const names = new Map(this.example().models.map((m) => [m.id, m.name]));
    const result = new Map<CapabilityId, string[]>();
    for (const [from, required] of requires) {
      if (excluded.has(from)) continue;
      for (const capability of required) {
        const providers = [...(providersOf.get(capability) ?? [])].filter((id) => !excluded.has(id));
        if (providers.length > 0) continue;
        if (!result.has(capability)) result.set(capability, []);
        result.get(capability)!.push(names.get(from) ?? from);
      }
    }
    return [...result].map(([capability, requiredBy]) => ({ capability, requiredBy }));
  });

  readonly boxW = BOX_W;
  readonly boxH = BOX_H;
}
