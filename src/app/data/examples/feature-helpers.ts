import type { Feature } from '../../core/model/feature-model.types';

/** Small builder shared by every example's data file — fills `childIds: []` unless overridden. */
export function feature(partial: Partial<Feature> & Pick<Feature, 'id' | 'name' | 'parentId' | 'edge'>): Feature {
  return { childIds: [], ...partial };
}
