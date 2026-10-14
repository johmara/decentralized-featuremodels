import type { Tour } from '../../core/model/tour.types';

/** Adapted from talk/var2026-talk-outline.md's beat structure, over the phone example. */
export const MAIN_TOUR: Tour = {
  id: 'main',
  title: 'Decentralized Feature Models, in eleven steps',
  steps: [
    {
      id: 'welcome',
      route: '/explore/phone',
      narration: {
        title: 'One phone, one feature model',
        body:
          'This is a feature model — a tree of options for building a phone. Mandatory features are always included, optional ones are a choice, and groups (OR, XOR) constrain how many of a set of alternatives you can pick.',
      },
      precondition: { mode: 'centralized', scope: null },
    },
    {
      id: 'monolith',
      route: '/explore/phone',
      narration: {
        title: 'Everything, in one place',
        body:
          'Messaging, Connectivity, and Keyboard all live in the same model. That works fine while one group maintains everything. It stops working once Messaging, Connectivity, and Keyboard are built in three different repos, on three different release schedules, by however many people each needs — which is how real phones are actually built.',
      },
      precondition: { mode: 'centralized', scope: null },
    },
    {
      id: 'split',
      route: '/explore/phone',
      narration: {
        title: 'Split by subsystem',
        body:
          'Switch to Decentralized: the same variability, now as four separate models, one per scope. Nobody merged these into one file — they were authored separately and stay separate.',
      },
      precondition: { mode: 'decentralized', scope: null },
    },
    {
      id: 'scope-ownership',
      route: '/explore/phone',
      narration: {
        title: 'Scope = the assets a model governs',
        body:
          'Click "lock to edit" on a card and it becomes the only one you can change. A model’s scope is the real folder it is placed on — messaging.fm governs messaging/, nothing else. A scope can have any number of people or teams working in it, and a team can work across several scopes — so a model belongs to its folder, not to a named team, because folders survive reorgs and team structures don’t.',
      },
      anchor: 'card-phone.messaging',
      precondition: { mode: 'decentralized', scope: 'phone.messaging' },
    },
    {
      id: 'boundary',
      route: '/explore/phone',
      narration: {
        title: 'No change ever crosses a scope boundary',
        body:
          'With Messaging locked, try clicking a feature in the Connectivity card — it is refused, not just visually dimmed. That refusal is enforced in the store, not the template, which is what makes it a guarantee instead of a convention.',
      },
      anchor: 'card-phone.connectivity',
      precondition: { mode: 'decentralized', scope: 'phone.messaging' },
    },
    {
      id: 'capabilities',
      route: '/explore/phone',
      narration: {
        title: 'Capabilities, not direct references',
        body:
          'Messaging never says "Connectivity.MobileData or Connectivity.Wifi." It says it Requires(InternetConnectivity) — a stable name. Any scope, present or future, can satisfy it by Providing that same capability. Watch the capability lane below light up as this preset’s selections come together.',
      },
      anchor: 'capability-lane',
      precondition: { mode: 'decentralized', scope: null, presetId: 'comic-email' },
    },
    {
      id: 'resolver-valid',
      route: '/explore/phone',
      narration: {
        title: 'Globally valid, checked without a global model',
        body:
          'Each scope configured itself independently — Messaging picked Email and Comic Email, Connectivity picked Mobile Data, Keyboard picked a layout and emoji support. The resolver only checks that every required capability has a provider. No model was ever combined into one to check this.',
      },
      anchor: 'resolver-panel',
      precondition: { mode: 'decentralized', scope: null, presetId: 'comic-email' },
    },
    {
      id: 'missing-capability',
      route: '/explore/phone',
      narration: {
        title: 'When something is missing, only one scope hears about it',
        body:
          'This preset removes Connectivity’s network choice. InternetConnectivity is now unprovided — and the resolver notifies only the Connectivity scope, because that is the only scope that can fix it. Messaging never finds out its request failed for a reason it cannot act on.',
      },
      anchor: 'capability-lane',
      precondition: { mode: 'decentralized', scope: null, presetId: 'missing-internet' },
    },
    {
      id: 'honest-friction',
      route: '/explore/phone',
      narration: {
        title: 'The hard case: two features that must never coexist',
        body:
          'Encrypted Messaging and Legacy Storage have never heard of each other, and never will — they live in different scopes. Encrypted Messaging requires SecureStorage; Legacy Storage provides InsecureStorage. A single global rule, ¬SecureStorage ∧ InsecureStorage, catches the conflict without either feature naming the other.',
      },
      anchor: 'resolver-panel',
      precondition: { mode: 'decentralized', scope: null, presetId: 'encrypted-friction' },
    },
    {
      id: 'local-stays-local',
      route: '/explore/phone',
      narration: {
        title: 'Only capability clauses cross the boundary',
        body:
          'Everything else — mandatory features, XOR groups, "pick at least one" — is checked entirely inside its own model. Only the capability layer, this thin contract of Requires and Provides, ever reasons about more than one scope at once. That is the whole mechanism.',
      },
      precondition: { mode: 'decentralized', scope: null, presetId: 'comic-email' },
    },
    {
      id: 'next-steps',
      route: '/explore/phone',
      narration: {
        title: 'From here',
        body:
          'The same idea shows up wherever ownership is split: a microservice webshop where services connect only through capabilities, or a Linux distribution with no owner at all. Explore either one, or see how this compares to existing feature-modeling techniques on the Compare page.',
      },
      precondition: { mode: 'decentralized', scope: null, presetId: 'comic-email' },
    },
  ],
};

export const TOURS: Readonly<Record<string, Tour>> = {
  [MAIN_TOUR.id]: MAIN_TOUR,
};
