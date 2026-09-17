import { describe, expect, it } from 'vitest';
import { layoutTree } from './tidy-tree';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';

describe('layoutTree', () => {
  it('places every feature of the keyboard model with no overlapping node boxes', () => {
    const keyboard = PHONE_EXAMPLE.models.find((m) => m.id === 'phone.keyboard')!;
    const layout = layoutTree(keyboard);

    expect(layout.nodes.size).toBe(keyboard.featureOrder.length);

    const boxes = [...layout.nodes.values()];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.y !== b.y) continue; // only same-row boxes can overlap horizontally in this layout
        const aLeft = a.x - a.width / 2;
        const aRight = a.x + a.width / 2;
        const bLeft = b.x - b.width / 2;
        const bRight = b.x + b.width / 2;
        const overlaps = aLeft < bRight && bLeft < aRight;
        expect(overlaps).toBe(false);
      }
    }
  });

  it('centers each parent over the span of its children', () => {
    const keyboard = PHONE_EXAMPLE.models.find((m) => m.id === 'phone.keyboard')!;
    const layout = layoutTree(keyboard);
    const layouts = layout.nodes.get('Layouts')!;
    const qwerty = layout.nodes.get('QWERTY')!;
    const qwertz = layout.nodes.get('QWERTZ')!;
    expect(layouts.x).toBeCloseTo((qwerty.x + qwertz.x) / 2, 5);
  });

  it('is deterministic under fixed metrics', () => {
    const keyboard = PHONE_EXAMPLE.models.find((m) => m.id === 'phone.keyboard')!;
    const layoutA = layoutTree(keyboard);
    const layoutB = layoutTree(keyboard);
    for (const id of keyboard.featureOrder) {
      expect(layoutA.nodes.get(id)).toEqual(layoutB.nodes.get(id));
    }
  });

  it('produces a group arc for every group, anchored at the group parent', () => {
    const keyboard = PHONE_EXAMPLE.models.find((m) => m.id === 'phone.keyboard')!;
    const layout = layoutTree(keyboard);
    expect(layout.groupArcs).toHaveLength(1);
    expect(layout.groupArcs[0].kind).toBe('xor');
    expect(layout.groupArcs[0].members).toHaveLength(3);
  });
});
