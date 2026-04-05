<script setup lang="ts">
import { onUnmounted } from 'vue';

const props = defineProps<{
  onCleanup: () => void;
}>();

onUnmounted(() => {
  props.onCleanup();
});
</script>

<template>
  <span>Mounted</span>
</template>
