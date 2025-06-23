<script setup lang="ts">
defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div class="flex items-center">
    <div class="logo-container mr-3">
      <img src="/nexus_logo.png" alt="Nexus" class="nexus-logo" />
    </div>
    <div v-if="!collapsed" class="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent transition-all duration-300">
      Nexus
    </div>
  </div>
</template>

<style scoped>
.logo-container {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nexus-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  transition: all 0.3s ease;
}

.nexus-logo:hover {
  transform: scale(1.05);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}
</style>
