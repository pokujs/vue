<script setup lang="ts">
import { inject } from 'vue';

const theme = inject(Symbol.for('poku.theme'), 'light');
</script>

<template>
  <p>Theme: {{ theme }}</p>
</template>
