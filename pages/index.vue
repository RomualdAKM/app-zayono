<template>
  <div></div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: () => {
    return navigateTo('/dashboard')
  },
})
</script>
