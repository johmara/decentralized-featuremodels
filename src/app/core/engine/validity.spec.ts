import { describe, expect, it } from 'vitest';
import { checkLocal } from './validity';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import type { FeatureModel } from '../model/feature-model.types';

function modelOf(id: string): FeatureModel {
  const model = PHONE_EXAMPLE.models.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model "${id}"`);
  return model;
}

describe('checkLocal', () => {
  it('flags mandatory descendants missing from an empty selection', () => {
    const result = checkLocal(modelOf('phone.keyboard'), new Set());
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === 'E_MANDATORY_UNSELECTED')).toBe(true);
  });

  it('is valid once BaseKeyboard, Layouts, and exactly one layout are selected', () => {
    const result = checkLocal(modelOf('phone.keyboard'), new Set(['BaseKeyboard', 'Layouts', 'QWERTY']));
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('flags selecting two XOR members at once', () => {
    const result = checkLocal(
      modelOf('phone.keyboard'),
      new Set(['BaseKeyboard', 'Layouts', 'QWERTY', 'AZERTY']),
    );
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === 'E_XOR_MULTIPLE')).toBe(true);
  });

  it('flags selecting zero XOR members while the group parent is selected', () => {
    const result = checkLocal(modelOf('phone.keyboard'), new Set(['BaseKeyboard', 'Layouts']));
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === 'E_XOR_NONE')).toBe(true);
  });

  it('flags a child selected without its parent', () => {
    const result = checkLocal(modelOf('phone.messaging'), new Set(['Attachments']));
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === 'E_ORPHAN_CHILD')).toBe(true);
  });

  it('flags zero OR members selected once the group parent is selected', () => {
    const result = checkLocal(modelOf('phone.messaging'), new Set());
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.code === 'E_OR_NONE')).toBe(true);
  });

  it('is valid selecting exactly one OR member', () => {
    const result = checkLocal(modelOf('phone.messaging'), new Set(['Email']));
    expect(result.valid).toBe(true);
  });

  it('is valid selecting more than one OR member', () => {
    const result = checkLocal(modelOf('phone.messaging'), new Set(['SMS', 'Email']));
    expect(result.valid).toBe(true);
  });

  it('is insensitive to the manual set already containing the root', () => {
    const withoutRoot = checkLocal(modelOf('phone.messaging'), new Set(['Email']));
    const withRootInSet = checkLocal(modelOf('phone.messaging'), new Set(['Messaging', 'Email']));
    expect(withoutRoot).toEqual(withRootInSet);
  });
});
