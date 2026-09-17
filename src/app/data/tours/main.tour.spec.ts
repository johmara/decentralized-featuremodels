import { describe, expect, it } from 'vitest';
import { MAIN_TOUR } from './main.tour';
import { EXAMPLES } from '../examples';

function exampleIdFromRoute(route: string): string {
  return route.split('/').pop() ?? '';
}

describe('MAIN_TOUR data', () => {
  it('has no duplicate step ids', () => {
    const ids = MAIN_TOUR.steps.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every step routes to a real example page', () => {
    for (const step of MAIN_TOUR.steps) {
      expect(step.route).toMatch(/^\/explore\/[a-z]+$/);
      expect(EXAMPLES[exampleIdFromRoute(step.route)]).toBeDefined();
    }
  });

  it('every presetId referenced exists on that step’s example', () => {
    for (const step of MAIN_TOUR.steps) {
      const presetId = step.precondition.presetId;
      if (!presetId) continue;
      const example = EXAMPLES[exampleIdFromRoute(step.route)];
      expect(example.presets.some((preset) => preset.id === presetId)).toBe(true);
    }
  });

  it('every scope precondition references a real model id on that step’s example', () => {
    for (const step of MAIN_TOUR.steps) {
      const scope = step.precondition.scope;
      if (!scope) continue;
      const example = EXAMPLES[exampleIdFromRoute(step.route)];
      expect(example.models.some((model) => model.id === scope)).toBe(true);
    }
  });

  it('every anchor has a recognized shape', () => {
    const knownAnchors = ['mode-toggle', 'capability-lane', 'resolver-panel'];
    for (const step of MAIN_TOUR.steps) {
      if (!step.anchor) continue;
      const known = knownAnchors.includes(step.anchor) || step.anchor.startsWith('card-');
      expect(known).toBe(true);
    }
  });

  it('has at least one step', () => {
    expect(MAIN_TOUR.steps.length).toBeGreaterThan(0);
  });
});
