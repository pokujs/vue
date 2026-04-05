<script setup lang="ts">
import { onMounted, ref } from 'vue';

const message = ref('Loading...');
const urgentState = ref('idle');
const deferredState = ref('idle');

onMounted(async () => {
  await Promise.resolve();
  message.value = 'Loaded from async setup';
});

const runPipeline = () => {
  urgentState.value = 'urgent-updated';
  queueMicrotask(() => {
    deferredState.value = 'queued-updated';
  });
};
</script>

<template>
  <section>
    <h2>{{ message }}</h2>
    <button type="button" @click="runPipeline">Run pipeline</button>
    <output aria-label="urgent-state">{{ urgentState }}</output>
    <output aria-label="deferred-state">{{ deferredState }}</output>
  </section>
</template>
