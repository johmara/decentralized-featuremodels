import type { ComparisonRow } from '../core/model/feature-model.types';

/**
 * The paper's state-of-the-art comparison (var2026/sota.tex:11-23) —
 * four axes checked against five prior modeling techniques plus this
 * paper's own proposal. Columns: does the technique still need a single
 * Global FM instance; can models be configured Independently; is scope
 * Asset-level (attached to real subsystems, not just logical views); does
 * it support truly Distributed configuration.
 */
export const SOTA_COMPARISON: readonly ComparisonRow[] = [
  {
    technique: 'Modular feature models',
    globalFm: 'yes',
    independentModels: 'no',
    assetScope: 'no',
    distributedConfig: 'no',
    note: 'Fragments exist for organization, but are reconstructed into one global model before analysis.',
  },
  {
    technique: 'Multi-view feature models',
    globalFm: 'yes',
    independentModels: 'no',
    assetScope: 'no',
    distributedConfig: 'no',
    note: 'Views project a single underlying model for different stakeholders — still one model underneath.',
  },
  {
    technique: 'Feature-model interfaces',
    globalFm: 'yes',
    independentModels: 'partial',
    assetScope: 'no',
    distributedConfig: 'no',
    note: 'Interfaces let sub-models be analyzed without full re-analysis, but composition still targets one model.',
  },
  {
    technique: 'FORCE (multi-level FM)',
    globalFm: 'yes',
    independentModels: 'partial',
    assetScope: 'partial',
    distributedConfig: 'no',
    note: 'Manages dependencies across problem/solution/configuration levels, but within one governed structure.',
  },
  {
    technique: 'Virtual platform',
    globalFm: 'yes',
    independentModels: 'partial',
    assetScope: 'yes',
    distributedConfig: 'no',
    note: 'Attaches variability to real assets incrementally, but still assembles one platform-level model.',
  },
  {
    technique: 'Decentralized feature models',
    globalFm: 'no',
    independentModels: 'yes',
    assetScope: 'yes',
    distributedConfig: 'yes',
    note: 'Models stay separate; capabilities carry cross-model dependencies without a permanent global instance.',
  },
];
