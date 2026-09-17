import { describe, expect, it } from 'vitest';
import { validateExample } from './validate-example';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';

describe('validateExample', () => {
  it('finds no structural errors in the phone example', () => {
    expect(validateExample(PHONE_EXAMPLE)).toEqual([]);
  });

  it('finds no structural errors in the phone example centralized model', () => {
    const centralizedOnly = { ...PHONE_EXAMPLE, models: [PHONE_EXAMPLE.centralized!] };
    expect(validateExample(centralizedOnly)).toEqual([]);
  });

  it('flags a dangling parent reference', () => {
    const broken = {
      ...PHONE_EXAMPLE,
      models: [
        {
          ...PHONE_EXAMPLE.models[0],
          features: {
            ...PHONE_EXAMPLE.models[0].features,
            SMS: { ...PHONE_EXAMPLE.models[0].features['SMS'], parentId: 'DoesNotExist' },
          },
        },
        ...PHONE_EXAMPLE.models.slice(1),
      ],
    };
    const errors = validateExample(broken);
    expect(errors.some((e) => e.includes('missing parent "DoesNotExist"'))).toBe(true);
  });

  it('flags an unknown capability reference', () => {
    const broken = {
      ...PHONE_EXAMPLE,
      capabilities: PHONE_EXAMPLE.capabilities.filter((c) => c.id !== 'KeyboardInput'),
    };
    const errors = validateExample(broken);
    expect(errors.some((e) => e.includes('unknown capability "KeyboardInput"'))).toBe(true);
  });
});
