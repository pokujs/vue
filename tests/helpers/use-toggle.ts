import { computed, ref } from 'vue';

export const useToggle = (initialValue = false) => {
  const enabled = ref(initialValue);

  return {
    enabled: computed(() => enabled.value),
    toggle() {
      enabled.value = !enabled.value;
    },
  };
};
