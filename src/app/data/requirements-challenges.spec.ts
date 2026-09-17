import { describe, expect, it } from 'vitest';
import { REQUIREMENTS } from './requirements';
import { CHALLENGES } from './challenges';
import { EXAMPLES } from './examples';

function checkDemoLink(demoLink: string): void {
  if (!demoLink.startsWith('/explore/')) return; // /compare and similar links need no data check
  const url = new URL(demoLink, 'https://example.invalid');
  const exampleId = url.pathname.split('/')[2];
  const example = EXAMPLES[exampleId];
  expect(example, `demoLink "${demoLink}" references unknown example "${exampleId}"`).toBeDefined();

  const presetId = url.searchParams.get('preset');
  if (presetId) {
    expect(
      example.presets.some((preset) => preset.id === presetId),
      `demoLink "${demoLink}" references unknown preset "${presetId}"`,
    ).toBe(true);
  }

  const scope = url.searchParams.get('scope');
  if (scope) {
    expect(
      example.models.some((model) => model.id === scope),
      `demoLink "${demoLink}" references unknown scope "${scope}"`,
    ).toBe(true);
  }
}

describe('requirements and challenges demo links', () => {
  it('every requirement demo link resolves to a real example, preset, and scope', () => {
    for (const item of REQUIREMENTS) checkDemoLink(item.demoLink);
  });

  it('every challenge demo link resolves to a real example, preset, and scope', () => {
    for (const item of CHALLENGES) checkDemoLink(item.demoLink);
  });

  it('every challenge’s relatesTo points at a real requirement id', () => {
    const requirementIds = new Set(REQUIREMENTS.map((r) => r.id));
    for (const item of CHALLENGES) {
      expect(requirementIds.has(item.relatesTo)).toBe(true);
    }
  });
});
