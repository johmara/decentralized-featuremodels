import type { Example, ExampleId } from '../../core/model/feature-model.types';
import { PHONE_EXAMPLE } from './phone.example';

// enterprise.example.ts and distro.example.ts join this registry in a later
// milestone (M10). Both are lazy-loaded from ExamplePage's route resolver;
// only the phone example is imported eagerly today because the guided tour
// opens on it.
export const EXAMPLES: Readonly<Record<ExampleId, Example>> = {
  phone: PHONE_EXAMPLE,
};

export const EXAMPLE_IDS: readonly ExampleId[] = Object.keys(EXAMPLES);

export function exampleById(id: ExampleId): Example {
  const example = EXAMPLES[id];
  if (!example) throw new Error(`Unknown example id "${id}"`);
  return example;
}
