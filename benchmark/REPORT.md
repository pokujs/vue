# Vue Testing Framework Benchmark Report

> Generated: Sun, 05 Apr 2026 15:25:14 GMT

## Environment

| Property | Value |
|---|---|
| Node.js | v22.5.1 |
| Platform | darwin 25.4.0 |
| CPU | Apple M3 Pro |
| CPU Cores | 12 |
| Total RAM | 18.0 GB |
| Runs/scenario | 7 (trim ±1) |

## Scenarios

Each scenario runs the **same 6 Vue tests** across 5 test files:

| Test File | Tests |
|---|---|
| 'counter.test.jsx' | 1 — stateful counter, event interaction |
| 'hooks.test.jsx' | 1 — composable exercised through a component harness |
| 'lifecycle.test.jsx' | 2 — `rerender`, `unmount` + lifecycle cleanup |
| 'context.test.jsx' | 1 — provide/inject context wiring |
| 'concurrency.test.jsx' | 1 — async mount + queued update pipeline |

### Frameworks under test

| Combination | DOM layer | Assertion style |
|---|---|---|
| poku + @pokujs/vue | happy-dom | `assert.strictEqual` |
| poku + @pokujs/vue | jsdom | `assert.strictEqual` |
| jest 30 + @testing-library/vue | jsdom (jest-environment-jsdom) | `expect().toBe()` |
| vitest 3 + @testing-library/vue | jsdom | `expect().toBe()` |
| vitest 3 + @testing-library/vue | happy-dom | `expect().toBe()` |

## Results

| Scenario           | Mean   | Min    | Max    | Stdev  | Peak RSS | vs poku+happy-dom |
|--------------------|--------|--------|--------|--------|----------|-------------------|
| poku + happy-dom   | 0.174s | 0.178s | 0.172s | 0.002s | 143.0 MB | *(baseline)*      |
| poku + jsdom       | 0.355s | 0.328s | 0.366s | 0.014s | 185.0 MB | +104%             |
| jest + jsdom       | 0.941s | 0.881s | 0.963s | 0.030s | 210.1 MB | +440%             |
| vitest + jsdom     | 1.014s | 1.005s | 1.019s | 0.006s | 151.6 MB | +482%             |
| vitest + happy-dom | 0.906s | 0.898s | 0.913s | 0.006s | 124.2 MB | +420%             |

> **Wall-clock time** is measured with `performance.now()` around the child-process spawn.
> **Peak RSS** is captured via `/usr/bin/time -l` on macOS (bytes → MB).
> The baseline for relative comparisons is **poku + happy-dom**.

## Analysis

### Overall ranking (mean wall-clock time)

1. **poku + happy-dom** — 0.174s
2. **poku + jsdom** — 0.355s
3. **vitest + happy-dom** — 0.906s
4. **jest + jsdom** — 0.941s
5. **vitest + jsdom** — 1.014s

### Speed comparison

- poku+happy-dom vs jest+jsdom: jest is **440% slower**
- poku+happy-dom vs vitest+jsdom: vitest is **482% slower**
- jest+jsdom vs vitest+jsdom: vitest is **8% slower** than jest

### DOM adapter impact

- **poku**: happy-dom vs jsdom — jsdom is **104% slower**
- **vitest**: happy-dom vs jsdom — jsdom is **12% slower**

### Memory footprint

- **vitest + happy-dom**: 124.2 MB peak RSS
- **poku + happy-dom**: 143.0 MB peak RSS
- **vitest + jsdom**: 151.6 MB peak RSS
- **poku + jsdom**: 185.0 MB peak RSS
- **jest + jsdom**: 210.1 MB peak RSS

### Consistency (lower stdev = more predictable)

- **poku + happy-dom**: σ = 0.002s
- **vitest + happy-dom**: σ = 0.006s
- **vitest + jsdom**: σ = 0.006s
- **poku + jsdom**: σ = 0.014s
- **jest + jsdom**: σ = 0.030s

## Key findings

- **Fastest**: poku + happy-dom — 0.174s mean
- **Slowest**: vitest + jsdom — 1.014s mean
- **Speed spread**: 482% difference between fastest and slowest

### Interpretation

**poku + @pokujs/vue** avoids the multi-process or bundler startup that jest (babel transform
pipeline) and vitest (Vite + module graph) require. Its architecture — isolated per-file Node.js
processes with minimal bootstrap — means cold-start overhead is proportional to the number of test
files, not to the framework's own initialization.

**jest** carries the heaviest startup cost due to:
1. Babel transformation of every benchmark file on first run (no persistent cache in this benchmark)
2. 'jest-worker' process pool initialisation
3. JSDOM environment setup per test file

**vitest** starts faster than jest because Vite's module graph is more efficient, and the
esbuild/Rollup pipeline is faster than Babel. However, the Vite dev server and HMR machinery still
contribute to startup overhead compared to a zero-bundler approach.

**DOM adapter choice** (happy-dom vs jsdom) has a measurable but smaller effect than the choice of
framework. happy-dom is generally lighter and initialises faster; jsdom is more spec-complete.

## Reproducibility

```sh
# Install benchmark deps (one-time)
cd benchmark && npm install && cd ..

# Re-run with custom run count
BENCH_RUNS=10 node benchmark/run.mjs
```

Results are saved to `benchmark/results.json` for programmatic analysis.
