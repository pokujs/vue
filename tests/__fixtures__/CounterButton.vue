<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    initialCount?: number;
  }>(),
  {
    initialCount: 0,
  }
);

const count = ref(props.initialCount);

const increment = () => {
  count.value += 1;
};
</script>

<template>
  <section>
    <h1>Count: {{ count }}</h1>
    <button type="button" @click="increment">Increment</button>
  </section>
</template>
