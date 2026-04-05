<script setup lang="ts">
defineProps<{
  name: string;
}>();
</script>

<template>
  <h3>Hello {{ name }}</h3>
</template>
