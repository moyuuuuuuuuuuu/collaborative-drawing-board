<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  Pencil, 
  Eraser, 
  Palette, 
  Undo2, 
  Redo2, 
  Download, 
  Share2
} from 'lucide-vue-next';

const props = defineProps<{
  activeTool: string;
  lineWidth: number;
  color: string;
}>();

const emit = defineEmits<{
  (e: 'selectTool', tool: string): void;
  (e: 'changeLineWidth', width: number): void;
  (e: 'changeColor', color: string): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
  (e: 'export'): void;
  (e: 'share'): void;
}>();

const showThickness = ref(false);
const showColors = ref(false);
const thicknessRef = ref<HTMLElement | null>(null);
const colorRef = ref<HTMLElement | null>(null);

const position = ref({ x: window.innerWidth / 2 - 200, y: window.innerHeight - 80 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const tools = [
  { id: 'pen', name: '画笔', icon: Pencil },
  { id: 'eraser', name: '橡皮擦', icon: Eraser },
  { id: 'color', name: '颜色', icon: Palette },
  { id: 'undo', name: '撤销', icon: Undo2 },
  { id: 'redo', name: '反撤销', icon: Redo2 },
  { id: 'export', name: '导出', icon: Download },
  { id: 'share', name: '分享', icon: Share2 },
];

const presetColors = [
  '#000000', '#ff0000', '#00ff00', '#0000ff', 
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500',
  '#800080', '#a52a2a', '#ffffff', '#808080'
];

const handleMouseDown = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.tool-item')) return;
  
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  };
  
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  let newX = e.clientX - dragOffset.value.x;
  let newY = e.clientY - dragOffset.value.y;
  
  // 边界检查
  newX = Math.max(0, Math.min(newX, window.innerWidth - 300));
  newY = Math.max(0, Math.min(newY, window.innerHeight - 60));
  
  position.value = { x: newX, y: newY };
};

const handleMouseUp = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
};

const selectTool = (toolId: string) => {
  if (toolId === 'pen' || toolId === 'eraser') {
    showColors.value = false;
    if (props.activeTool === toolId) {
      showThickness.value = !showThickness.value;
    } else {
      emit('selectTool', toolId);
      showThickness.value = true;
    }
  } else if (toolId === 'color') {
    showThickness.value = false;
    showColors.value = !showColors.value;
  } else {
    showThickness.value = false;
    showColors.value = false;
    if (toolId === 'undo') emit('undo');
    else if (toolId === 'redo') emit('redo');
    else if (toolId === 'export') emit('export');
    else if (toolId === 'share') emit('share');
    else emit('selectTool', toolId);
  }
};

const handleThicknessChange = (e: Event) => {
  const value = (e.target as HTMLInputElement).value;
  emit('changeLineWidth', parseInt(value));
};

const handleColorChange = (e: Event) => {
  const color = (e.target as HTMLInputElement).value;
  emit('changeColor', color);
};

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const isToolItem = target.closest('.tool-item');
  
  if (showThickness.value && thicknessRef.value && !thicknessRef.value.contains(e.target as Node) && !isToolItem) {
    showThickness.value = false;
  }
  if (showColors.value && colorRef.value && !colorRef.value.contains(e.target as Node) && !isToolItem) {
    showColors.value = false;
  }
};

onMounted(() => {
  window.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  window.removeEventListener('mousedown', handleClickOutside);
});
</script>

<template>
  <div 
    class="tabbar-container" 
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @mousedown="handleMouseDown"
  >
    <!-- 粗细调节面板 -->
    <div v-if="showThickness" ref="thicknessRef" class="thickness-panel" @mousedown.stop>
      <div class="thickness-label">粗细: {{ lineWidth }}px</div>
      <input 
        type="range" 
        min="1" 
        max="50" 
        :value="lineWidth" 
        @input="handleThicknessChange"
        @mousedown.stop
        class="thickness-slider"
      />
      <div class="thickness-presets">
        <div 
          v-for="size in [2, 5, 10, 20]" 
          :key="size" 
          class="preset-dot"
          :style="{ width: size + 'px', height: size + 'px' }"
          @click="emit('changeLineWidth', size)"
        ></div>
      </div>
    </div>

    <!-- 颜色调节面板 -->
    <div v-if="showColors" ref="colorRef" class="color-panel" @mousedown.stop>
      <div class="color-presets">
        <div 
          v-for="c in presetColors" 
          :key="c" 
          class="color-dot"
          :style="{ backgroundColor: c }"
          :class="{ active: c === color }"
          @click="emit('changeColor', c)"
        ></div>
      </div>
      <div class="custom-color">
        <span>自定义:</span>
        <input type="color" :value="color" @input="handleColorChange" @mousedown.stop />
      </div>
    </div>

    <div 
      v-for="tool in tools" 
      :key="tool.id" 
      class="tool-item"
      :class="{ active: activeTool === tool.id || (tool.id === 'color' && showColors) }"
      @click="selectTool(tool.id)"
      :title="tool.name"
      style="position: relative;"
    >
      <component :is="tool.icon" :size="20" class="tool-icon-svg" />
      <div v-if="tool.id === 'color'" class="current-color-indicator" :style="{ backgroundColor: color }"></div>
    </div>
  </div>
</template>

<style scoped>
.tabbar-container {
  position: fixed;
  display: flex;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  padding: 8px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: move;
  z-index: 1000;
  user-select: none;
  border: 1px solid #ddd;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .tabbar-container {
    background-color: rgba(30, 30, 30, 0.9);
    border-color: #444;
    color: #eee;
  }
}

.tool-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tool-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .tool-item:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

.tool-item.active {
  background-color: #007aff;
  color: white;
}

.tool-icon-svg {
  display: flex;
  align-items: center;
  justify-content: center;
}

.thickness-panel, .color-panel {
  position: absolute;
  bottom: 60px;
  left: 0;
  right: 0;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1001;
}

@media (prefers-color-scheme: dark) {
  .thickness-panel, .color-panel {
    background-color: rgba(30, 30, 30, 0.95);
    border-color: #444;
  }
}

.color-presets {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid #ddd;
  transition: transform 0.2s;
}

.color-dot:hover {
  transform: scale(1.2);
}

.color-dot.active {
  border: 2px solid #646cff;
}

.custom-color {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  margin-top: 5px;
  border-top: 1px solid #eee;
  padding-top: 5px;
  width: 100%;
  justify-content: center;
}

@media (prefers-color-scheme: dark) {
  .custom-color {
    border-top-color: #444;
  }
}

.current-color-indicator {
  width: 14px;
  height: 2px;
  border-radius: 1px;
  position: absolute;
  bottom: 6px;
}

.thickness-label {
  font-size: 12px;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .thickness-label {
    color: #aaa;
  }
}

.thickness-slider {
  width: 100%;
  cursor: pointer;
}

.thickness-presets {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 24px;
}

.preset-dot {
  background-color: #333;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s;
}

@media (prefers-color-scheme: dark) {
  .preset-dot {
    background-color: #ccc;
  }
}

.preset-dot:hover {
  transform: scale(1.2);
}
</style>
