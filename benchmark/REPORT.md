# Vue Testing Framework Benchmark Report

> Generated: Mon, 20 Apr 2026 02:17:14 GMT

## Environment

| Property | Value |
|---|---|
| Node.js | v22.5.1 |
| Platform | darwin 25.5.0 |
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
| poku + happy-dom   | 0.145s | 0.139s | 0.145s | 0.006s | 146.3 MB | *(baseline)*      |
| poku + jsdom       | 0.313s | 0.325s | 0.317s | 0.013s | 190.2 MB | +116%             |
| jest + jsdom       | 0.895s | 0.845s | 1.044s | 0.075s | 212.7 MB | +518%             |
| vitest + jsdom     | 1.292s | 1.188s | 1.461s | 0.115s | 153.9 MB | +792%             |
| vitest + happy-dom | 1.208s | 1.096s | 1.264s | 0.058s | 125.4 MB | +734%             |

> **Wall-clock time** is measured with `performance.now()` around the child-process spawn.
> **Peak RSS** is captured via `/usr/bin/time -l` on macOS (bytes → MB).
> The baseline for relative comparisons is **poku + happy-dom**.

## Analysis

### Overall ranking (mean wall-clock time)

1. **poku + happy-dom** — 0.145s
2. **poku + jsdom** — 0.313s
3. **jest + jsdom** — 0.895s
4. **vitest + happy-dom** — 1.208s
5. **vitest + jsdom** — 1.292s

### Speed comparison

- poku+happy-dom vs jest+jsdom: jest is **518% slower**
- poku+happy-dom vs vitest+jsdom: vitest is **792% slower**
- jest+jsdom vs vitest+jsdom: vitest is **44% slower** than jest

### DOM adapter impact

- **poku**: happy-dom vs jsdom — jsdom is **116% slower**
- **vitest**: happy-dom vs jsdom — jsdom is **7% slower**

### Memory footprint

- **vitest + happy-dom**: 125.4 MB peak RSS
- **poku + happy-dom**: 146.3 MB peak RSS
- **vitest + jsdom**: 153.9 MB peak RSS
- **poku + jsdom**: 190.2 MB peak RSS
- **jest + jsdom**: 212.7 MB peak RSS

### Consistency (lower stdev = more predictable)

- **poku + happy-dom**: σ = 0.006s
- **poku + jsdom**: σ = 0.013s
- **vitest + happy-dom**: σ = 0.058s
- **jest + jsdom**: σ = 0.075s
- **vitest + jsdom**: σ = 0.115s

## Key findings

- **Fastest**: poku + happy-dom — 0.145s mean
- **Slowest**: vitest + jsdom — 1.292s mean
- **Speed spread**: 792% difference between fastest and slowest

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
