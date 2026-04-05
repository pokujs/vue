<script setup lang="ts">
import { computed, ref } from 'vue';

const enabledValue = ref(false);
const enabled = computed(() => enabledValue.value);

const toggle = () => {
  enabledValue.value = !enabledValue.value;
};
</script>

<template>
  <div>
    <output aria-label="toggle-state">{{ enabled ? 'enabled' : 'disabled' }}</output>
    <button type="button" @click="toggle">Toggle</button>
  </div>
</template>
