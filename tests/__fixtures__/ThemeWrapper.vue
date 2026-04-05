<script setup lang="ts">
import { provide } from 'vue';

provide(Symbol.for('poku.theme'), 'dark');
</script>

<template>
  <slot />
</template>
