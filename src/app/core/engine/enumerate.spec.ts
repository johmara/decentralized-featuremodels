import { describe, expect, it } from 'vitest';
import { enumerateLocal } from './enumerate';
import { PHONE_EXAMPLE } from '../../data/examples/phone.example';
import type { FeatureModel } from '../model/feature-model.types';

function modelOf(id: string): FeatureModel {
  const model = PHONE_EXAMPLE.models.find((m) => m.id === id);
  if (!model) throw new Error(`Unknown model "${id}"`);
  return model;
}

describe('enumerateLocal', () => {
  it('enumerates exactly the 6 valid keyboard configurations (3 layouts x 2 emoji choices)', () => {
    const { configs, complete } = enumerateLocal(modelOf('phone.keyboard'));
    expect(complete).toBe(true);
    expect(configs).toHaveLength(6);

    for (const cfg of configs) {
      expect(cfg.has('Keyboard')).toBe(true);
      expect(cfg.has('BaseKeyboard')).toBe(true);
      expect(cfg.has('Layouts')).toBe(true);
      const layoutCount = ['QWERTY', 'AZERTY', 'QWERTZ'].filter((id) => cfg.has(id)).length;
      expect(layoutCount).toBe(1);
    }
  });

  it('enumerates exactly 18 valid messaging configurations', () => {
    // msg-type OR{SMS,Email}: {SMS} contributes 1 x 2 (encrypted), {Email} and {SMS,Email}
    // each contribute 4 (Attachments x ComicEmail) x 2 (encrypted) = 8. Total 2 + 8 + 8 = 18.
    const { configs, complete } = enumerateLocal(modelOf('phone.messaging'));
    expect(complete).toBe(true);
    expect(configs).toHaveLength(18);

    for (const cfg of configs) {
      const smsOrEmail = cfg.has('SMS') || cfg.has('Email');
      expect(smsOrEmail).toBe(true);
      if (cfg.has('Attachments') || cfg.has('ComicEmail')) {
        expect(cfg.has('Email')).toBe(true);
      }
    }
  });

  it('every enumerated configuration satisfies the model’s own constraints', () => {
    for (const model of PHONE_EXAMPLE.models) {
      const { configs } = enumerateLocal(model);
      for (const cfg of configs) {
        for (const constraint of model.constraints) {
          if (!cfg.has(constraint.source)) continue;
          if (constraint.kind === 'implies') {
            expect(cfg.has(constraint.target)).toBe(true);
          } else if (constraint.kind === 'excludes') {
            expect(cfg.has(constraint.target)).toBe(false);
          } else {
            expect(constraint.targets.some((id) => cfg.has(id))).toBe(true);
          }
        }
      }
    }
  });
});
