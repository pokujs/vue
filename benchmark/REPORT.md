# Vue Testing Framework Benchmark Report

> Generated: Sun, 05 Apr 2026 16:07:05 GMT

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
| poku + happy-dom   | 0.187s | 0.173s | 0.222s | 0.018s | 142.9 MB | *(baseline)*      |
| poku + jsdom       | 0.385s | 0.345s | 0.459s | 0.039s | 186.1 MB | +106%             |
| jest + jsdom       | 0.987s | 0.957s | 1.021s | 0.026s | 209.3 MB | +428%             |
| vitest + jsdom     | 1.022s | 0.984s | 1.055s | 0.026s | 152.4 MB | +446%             |
| vitest + happy-dom | 1.013s | 0.941s | 1.113s | 0.060s | 120.8 MB | +442%             |

> **Wall-clock time** is measured with `performance.now()` around the child-process spawn.
> **Peak RSS** is captured via `/usr/bin/time -l` on macOS (bytes → MB).
> The baseline for relative comparisons is **poku + happy-dom**.

## Analysis

### Overall ranking (mean wall-clock time)

1. **poku + happy-dom** — 0.187s
2. **poku + jsdom** — 0.385s
3. **jest + jsdom** — 0.987s
4. **vitest + happy-dom** — 1.013s
5. **vitest + jsdom** — 1.022s

### Speed comparison

- poku+happy-dom vs jest+jsdom: jest is **428% slower**
- poku+happy-dom vs vitest+jsdom: vitest is **446% slower**
- jest+jsdom vs vitest+jsdom: vitest is **4% slower** than jest

### DOM adapter impact

- **poku**: happy-dom vs jsdom — jsdom is **106% slower**
- **vitest**: happy-dom vs jsdom — jsdom is **1% slower**

### Memory footprint

- **vitest + happy-dom**: 120.8 MB peak RSS
- **poku + happy-dom**: 142.9 MB peak RSS
- **vitest + jsdom**: 152.4 MB peak RSS
- **poku + jsdom**: 186.1 MB peak RSS
- **jest + jsdom**: 209.3 MB peak RSS

### Consistency (lower stdev = more predictable)

- **poku + happy-dom**: σ = 0.018s
- **jest + jsdom**: σ = 0.026s
- **vitest + jsdom**: σ = 0.026s
- **poku + jsdom**: σ = 0.039s
- **vitest + happy-dom**: σ = 0.060s

## Key findings

- **Fastest**: poku + happy-dom — 0.187s mean
- **Slowest**: vitest + jsdom — 1.022s mean
- **Speed spread**: 446% difference between fastest and slowest

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
