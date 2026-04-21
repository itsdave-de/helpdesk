<template>
  <FrappeAvatar
    :label="computedLabel"
    :image="image"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { Avatar as FrappeAvatar } from "frappe-ui";
import { computed } from "vue";

const props = defineProps({
  label: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
});

// Same logic as frappe.utils.get_abbr()
function getAbbr(str: string, maxLen: number = 2): string {
  if (!str) return "?";
  let abbr = "";
  for (const part of str.split(" ")) {
    if (abbr.length < maxLen && part) {
      abbr += part[0];
    }
  }
  return abbr.toUpperCase() || str[0]?.toUpperCase() || "?";
}

const computedLabel = computed(() => getAbbr(props.label));
</script>
