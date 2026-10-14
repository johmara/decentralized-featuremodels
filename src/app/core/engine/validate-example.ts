import { ruleCapabilities, type Example, type FeatureModel, type ModelId } from '../model/feature-model.types';

/**
 * Structural data invariants for an {@link Example} — dangling references,
 * inconsistent parent/child links, malformed groups, unknown capability
 * ids. Run as a unit test against every shipped example, never at runtime.
 */
export function validateExample(example: Example): string[] {
  const errors: string[] = [];
  const modelIds = new Set<ModelId>();

  for (const model of example.models) {
    if (modelIds.has(model.id)) errors.push(`Duplicate model id "${model.id}"`);
    modelIds.add(model.id);
    errors.push(...validateModel(model));
  }

  const capabilityIds = new Set(example.capabilities.map((capability) => capability.id));
  for (const model of example.models) {
    for (const featureId of model.featureOrder) {
      const feature = model.features[featureId];
      if (!feature) continue;
      for (const capabilityId of [...(feature.requires ?? []), ...(feature.provides ?? [])]) {
        if (!capabilityIds.has(capabilityId)) {
          errors.push(
            `Model "${model.id}" feature "${featureId}" references unknown capability "${capabilityId}"`,
          );
        }
      }
    }
  }

  for (const rule of example.globalRules) {
    for (const capabilityId of ruleCapabilities(rule)) {
      if (!capabilityIds.has(capabilityId)) errors.push(`Global rule references unknown capability "${capabilityId}"`);
    }
  }

  return errors;
}

function validateModel(model: FeatureModel): string[] {
  const errors: string[] = [];
  const root = model.features[model.rootId];

  if (!root) {
    errors.push(`Model "${model.id}": root "${model.rootId}" not found in features`);
  } else if (root.parentId !== null) {
    errors.push(`Model "${model.id}": root must have parentId null`);
  }

  for (const featureId of model.featureOrder) {
    const feature = model.features[featureId];
    if (!feature) {
      errors.push(`Model "${model.id}": featureOrder references missing feature "${featureId}"`);
      continue;
    }
    if (feature.id !== featureId) {
      errors.push(`Model "${model.id}": feature key "${featureId}" does not match its id "${feature.id}"`);
    }

    if (feature.parentId !== null) {
      const parent = model.features[feature.parentId];
      if (!parent) {
        errors.push(`Model "${model.id}": feature "${featureId}" has missing parent "${feature.parentId}"`);
      } else if (!parent.childIds.includes(featureId)) {
        errors.push(`Model "${model.id}": parent "${feature.parentId}" does not list "${featureId}" as a child`);
      }
    }

    for (const childId of feature.childIds) {
      const child = model.features[childId];
      if (!child) {
        errors.push(`Model "${model.id}": feature "${featureId}" lists missing child "${childId}"`);
      } else if (child.parentId !== featureId) {
        errors.push(`Model "${model.id}": child "${childId}" does not point back to parent "${featureId}"`);
      }
    }

    if (feature.edge === 'grouped') {
      if (!feature.groupId || !model.groups[feature.groupId]) {
        errors.push(`Model "${model.id}": feature "${featureId}" has edge "grouped" but no valid groupId`);
      } else if (!model.groups[feature.groupId].memberIds.includes(featureId)) {
        errors.push(`Model "${model.id}": feature "${featureId}" not listed as a member of its own group "${feature.groupId}"`);
      }
    } else if (feature.groupId) {
      errors.push(`Model "${model.id}": feature "${featureId}" has groupId set but edge is "${feature.edge}", expected "grouped"`);
    }
  }

  for (const group of Object.values(model.groups)) {
    if (!model.features[group.parentId]) {
      errors.push(`Model "${model.id}": group "${group.id}" has missing parent "${group.parentId}"`);
    }
    if (group.memberIds.length === 0) {
      errors.push(`Model "${model.id}": group "${group.id}" has no members`);
    }
    for (const memberId of group.memberIds) {
      const member = model.features[memberId];
      if (!member) {
        errors.push(`Model "${model.id}": group "${group.id}" has missing member "${memberId}"`);
      } else if (member.groupId !== group.id) {
        errors.push(`Model "${model.id}": member "${memberId}" of group "${group.id}" has groupId "${member.groupId}"`);
      } else if (member.edge !== 'grouped') {
        errors.push(`Model "${model.id}": member "${memberId}" of group "${group.id}" has edge "${member.edge}", expected "grouped"`);
      }
    }
  }

  for (const constraint of model.constraints) {
    if (!model.features[constraint.source]) {
      errors.push(`Model "${model.id}": constraint "${constraint.id}" has missing source "${constraint.source}"`);
    }
    if (constraint.kind === 'requiresAny') {
      for (const targetId of constraint.targets) {
        if (!model.features[targetId]) {
          errors.push(`Model "${model.id}": constraint "${constraint.id}" has missing target "${targetId}"`);
        }
      }
    } else if (!model.features[constraint.target]) {
      errors.push(`Model "${model.id}": constraint "${constraint.id}" has missing target "${constraint.target}"`);
    }
  }

  const orderSet = new Set(model.featureOrder);
  for (const featureId of Object.keys(model.features)) {
    if (!orderSet.has(featureId)) {
      errors.push(`Model "${model.id}": feature "${featureId}" missing from featureOrder`);
    }
  }

  return errors;
}
