# Decentralized Feature Models

An interactive site for learning feature models and **decentralized feature models**: a feature-modeling
approach where each team owns its own model for its own scope, and models coordinate only through named
*capabilities* (`requires` / `provides`) instead of a shared global model.

It is an unofficial companion to the paper
[*Towards Decentralized Feature Models*](https://johan.martinson.phd/assets/publications/2026_towards_decentralized_feature_models.pdf)
(Mukelabai, Martinson, Mahmood, Berger, Capilla — Variability 2026). The paper is the authority; this site
makes its ideas explorable.

**Live site:** https://johmara.github.io/decentralized-featuremodels/

## What is in it

- **Explore** — worked examples, each with a centralized (monolithic) model and its decentralized
  counterpart. Configure each scope on its own and watch a decentralized resolver combine the results.
  - **Phone** — hardware and software split by subsystem; the paper's running example.
  - **Microservices** — the general case: a flat mesh of independently owned services connected only by capabilities.
  - **Open-source distro** — a kernel subsystem, a filesystem, a distro, and packages, with no central owner.
- **Sandbox** — build your own decentralized model in the browser: add scopes, features and capabilities,
  configure them, and see the resolver and a scope map of how scopes depend on each other. Supports undo/redo,
  JSON import/export, and starting from any shipped example. Saved in your browser.
- **Global rules** — direct cross-scope constraints (the paper's C<sub>interactions</sub>) as a last resort:
  `A ≠ B` (cannot coexist), `A ⇒ B` (implies), `C ≤ 1 provider`. Always phrased over capabilities, and the
  sandbox asks you to confirm there is no capability-only alternative.
- **Guided tour**, **Compare** (state-of-the-art table, formulas, requirements and challenges), and a **Learn**
  section.

## Core ideas, as implemented

- A feature model is a tree with mandatory, optional, OR and XOR edges, owned by one *scope* (repo or folder).
- Cross-model dependencies are **capabilities**, never direct references to another model's features.
- A configuration is globally valid when every model is locally valid, every required capability has a
  provider, and no global rule is violated.
- When a capability is missing, the resolver notifies only the scopes that *can* provide it.
- `centralize()` flattens a decentralized example into the equivalent monolith; tests check that both agree
  on validity for every combination of local configurations.

## Development

Requires Node.js 24 and npm.

```bash
npm ci
npx ng serve              # http://localhost:4200
npx ng test --watch=false # unit tests (Vitest)
npx ng build              # production build into dist/dfm
```

Note: run tests through `ng test`. Plain `vitest` lacks Angular's test setup and fails on component specs.

### Project layout

```
src/app/
  core/
    model/     domain types (feature models, capabilities, global rules)
    engine/    propagation, local validity, capability ledger, resolver, centralize, sandbox edits
    layout/    deterministic tree layout
    state/     signal stores (configuration, sandbox)
    tour/ url/ guided tour, shareable-link codec
  data/        examples, formulas, requirements and challenges, tours, lessons
  features/    pages: home, explore, sandbox, compare, learn, glossary
  ui/          presentational components: feature tree, scope map, capability lane, legend, ...
```

### Adding an example

Create `src/app/data/examples/<name>.example.ts` exporting an `Example` (models, capabilities, presets, and
optionally a `centralized` model), then register it in `src/app/data/examples/index.ts` and add a card on the
home page. `examples.spec.ts` validates every registered example structurally and resolves every preset.

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: tests, a production build with the repository's base
href, an SPA `404.html` fallback, and a deploy to GitHub Pages. Pages must be set to *Source: GitHub Actions*
in the repository settings.

## License

Copyright © 2026 Johan Martinson. No license has been chosen yet, so all rights are reserved: you may read the
code and use the live site, but not reuse or redistribute the source until a license is added.
