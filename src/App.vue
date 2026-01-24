<script setup lang="ts">
import InfiniteCanvas from './components/InfiniteCanvas.vue'
</script>

<template>
  <InfiniteCanvas />
</template>

<style>
/* 确保基础容器占满全屏且无滚动条 */
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
