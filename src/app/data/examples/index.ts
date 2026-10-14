import type { Example, ExampleId } from '../../core/model/feature-model.types';
import { PHONE_EXAMPLE } from './phone.example';
import { DISTRO_EXAMPLE } from './distro.example';
import { MICROSERVICES_EXAMPLE } from './microservices.example';

export const EXAMPLES: Readonly<Record<ExampleId, Example>> = {
  phone: PHONE_EXAMPLE,
  distro: DISTRO_EXAMPLE,
  microservices: MICROSERVICES_EXAMPLE,
};

export const EXAMPLE_IDS: readonly ExampleId[] = Object.keys(EXAMPLES);

export function exampleById(id: ExampleId): Example {
  const example = EXAMPLES[id];
  if (!example) throw new Error(`Unknown example id "${id}"`);
  return example;
}
