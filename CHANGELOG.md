# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-04-05

### Added

- Initial public release of `@pokujs/vue`.
- Vue 3 SFC testing support via custom ESM loader hooks (`tsx` + `@vue/compiler-sfc` + `esbuild`).
- `render`, `screen`, `fireEvent`, `waitFor`, `cleanup` and `act` exports mirroring `@testing-library/vue`.
- Poku isolation plugin (`createPokuPlugin`) with `isolation: 'none'` support for happy-dom and jsdom.
- Shared DOM and plugin infrastructure via `@pokujs/dom`.
- Full benchmark suite comparing Poku, Jest, and Vitest across happy-dom and jsdom.
- CI/CD, CodeQL, publish, and compatibility workflows.
