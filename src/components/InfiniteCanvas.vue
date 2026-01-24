<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import { io, Socket } from 'socket.io-client';
import TabBar from './TabBar.vue';
import { MousePointer2, Maximize2, Minimize2, Users } from 'lucide-vue-next';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let socket: Socket | null = null;

// 房间 ID
const roomId = ref('');

// 初始化房间 ID
const initRoom = () => {
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('room');
  if (!id) {
    id = Math.random().toString(36).substring(2, 9);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('room', id);
    window.history.replaceState({}, '', newUrl.toString());
  }
  roomId.value = id;
};

initRoom();

// 绘图历史
const history = reactive<{
  undoStack: string[];
  redoStack: string[];
}>({
  undoStack: [],
  redoStack: [],
});

// 生成随机颜色给光标
const myColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

// 绘图状态
const drawState = reactive({
  activeTool: 'pen',
  isDrawing: false,
  color: '#000000',
  lineWidth: 2,
  lastX: 0,
  lastY: 0,
});

// 远程用户信息
const remoteUsers = ref<Map<string, { x: number, y: number, color: string }>>(new Map());

// 视口状态
const state = reactive({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
});

// 计算背景网格样式
const gridStyle = computed(() => {
  const size = 50 * state.scale;
  return {
    backgroundImage: `
      linear-gradient(to right, #e0e0e0 1px, transparent 1px),
      linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)
    `,
    backgroundSize: `${size}px ${size}px`,
    backgroundPosition: `${state.offsetX}px ${state.offsetY}px`,
  };
});

let ctx: CanvasRenderingContext2D | null = null;

// 保存当前状态到撤销栈
const saveHistory = () => {
  if (!canvasRef.value) return;
  const dataUrl = canvasRef.value.toDataURL();
  history.undoStack.push(dataUrl);
  if (history.undoStack.length > 50) {
    history.undoStack.shift();
  }
  history.redoStack = [];
};

// 撤销
const undo = () => {
  if (history.undoStack.length === 0) return;
  
  if (canvasRef.value) {
    history.redoStack.push(canvasRef.value.toDataURL());
  }
  
  const lastState = history.undoStack.pop();
  if (lastState) {
    restoreState(lastState);
  }
};

// 反撤销
const redo = () => {
  if (history.redoStack.length === 0) return;
  
  if (canvasRef.value) {
    history.undoStack.push(canvasRef.value.toDataURL());
  }
  
  const nextState = history.redoStack.pop();
  if (nextState) {
    restoreState(nextState);
  }
};

// 恢复画布状态
const restoreState = (dataUrl: string, isRemote: boolean = false) => {
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    if (!ctx || !canvasRef.value) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    ctx.drawImage(img, 0, 0);
    
    // 如果是本地恢复，同步给其他客户端
    if (!isRemote && socket) {
      socket.emit('history-sync', { roomId: roomId.value, dataUrl });
    }
  };
};

// 导出为图片
const exportImage = () => {
  if (!canvasRef.value) return;
  const link = document.createElement('a');
  link.download = 'canvas-export.png';
  link.href = canvasRef.value.toDataURL();
  link.click();
};

// 分享
const shareLink = () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert(`邀请链接已复制！\n房间 ID: ${roomId.value}\n发送给好友即可开始协作。`);
  });
};

// 初始化画布大小
const resizeCanvas = () => {
  if (canvasRef.value && containerRef.value) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.value.width;
    tempCanvas.height = canvasRef.value.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) tempCtx.drawImage(canvasRef.value, 0, 0);

    canvasRef.value.width = containerRef.value.clientWidth;
    canvasRef.value.height = containerRef.value.clientHeight;
    
    // 重新绘制背景和已有的内容
    draw();
    if (ctx) ctx.drawImage(tempCanvas, 0, 0);
  }
};

// 坐标转换：屏幕坐标转画布坐标
const screenToCanvas = (screenX: number, screenY: number) => {
  const x = (screenX - state.offsetX) / state.scale;
  const y = (screenY - state.offsetY) / state.scale;
  return { x, y };
};

// 绘制网格背景（模拟无限感）
const drawGrid = (width: number, height: number) => {
  if (!ctx) return;
  const gridSize = 50;
  const startX = Math.floor((-state.offsetX / state.scale) / gridSize) * gridSize;
  const startY = Math.floor((-state.offsetY / state.scale) / gridSize) * gridSize;
  const endX = startX + width / state.scale + gridSize;
  const endY = startY + height / state.scale + gridSize;

  ctx.beginPath();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1 / state.scale;

  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
};

// 绘制函数
const draw = () => {
  if (!ctx || !canvasRef.value) return;
  // 这里目前不需要做什么，因为绘图是直接在 ctx 上操作的
};

// 坐标转换：画布坐标转屏幕坐标
const canvasToScreen = (canvasX: number, canvasY: number) => {
  const x = canvasX * state.scale + state.offsetX;
  const y = canvasY * state.scale + state.offsetY;
  return { x, y };
};

// 处理来自远程的绘制数据
const handleRemoteDraw = (data: any) => {
  if (!ctx) return;
  
  ctx.save();
  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);
  
  ctx.beginPath();
  ctx.moveTo(data.lastX, data.lastY);
  ctx.lineTo(data.x, data.y);
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (data.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = (data.lineWidth * 5) / state.scale;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth / state.scale;
  }
  
  ctx.stroke();
  ctx.restore();

  // 更新远程用户的光标位置（可选，这里先只实现绘制）
};

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const zoomSpeed = 0.001;
  const delta = -e.deltaY;
  const zoomFactor = Math.pow(1.1, delta / 100);
  
  const newScale = state.scale * zoomFactor;
  
  // 限制缩放范围
  if (newScale < 0.1 || newScale > 20) return;

  // 以鼠标位置为中心缩放
  const mouseX = e.offsetX;
  const mouseY = e.offsetY;

  // 计算鼠标在当前缩放下的画布坐标
  const beforeZoom = screenToCanvas(mouseX, mouseY);

  state.scale = newScale;

  // 重新计算偏移量，使得缩放后鼠标位置对应的画布坐标不变
  state.offsetX = mouseX - beforeZoom.x * state.scale;
  state.offsetY = mouseY - beforeZoom.y * state.scale;

  draw();
};

// 鼠标按下
const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 1 || (e.button === 0 && e.altKey)) { // 中键或 Alt+左键 拖拽视口
    state.isDragging = true;
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
    return;
  }

  if (e.button === 0) { // 左键
    if (drawState.activeTool === 'pen' || drawState.activeTool === 'eraser') {
      saveHistory();
      drawState.isDrawing = true;
      const { x, y } = screenToCanvas(e.offsetX, e.offsetY);
      drawState.lastX = x;
      drawState.lastY = y;
      
      if (!ctx) return;
      ctx.save();
      ctx.translate(state.offsetX, state.offsetY);
      ctx.scale(state.scale, state.scale);
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = drawState.lineWidth / state.scale;
      
      if (drawState.activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = (drawState.lineWidth * 5) / state.scale; // 橡皮擦默认更粗
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = drawState.color;
      }
    } else {
      // 默认拖拽视口
      state.isDragging = true;
      state.lastMouseX = e.clientX;
      state.lastMouseY = e.clientY;
    }
  }
};

// 鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (state.isDragging) {
    const deltaX = e.clientX - state.lastMouseX;
    const deltaY = e.clientY - state.lastMouseY;

    state.offsetX += deltaX;
    state.offsetY += deltaY;

    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;

    draw();
    return;
  }

  if (drawState.isDrawing && ctx) {
    const { x, y } = screenToCanvas(e.offsetX, e.offsetY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // 发送绘图数据
    if (socket) {
      socket.emit('draw', {
        x,
        y,
        lastX: drawState.lastX,
        lastY: drawState.lastY,
        color: drawState.activeTool === 'eraser' ? null : drawState.color,
        lineWidth: drawState.lineWidth,
        tool: drawState.activeTool,
        userId: socket.id,
        roomId: roomId.value
      });
    }
    drawState.lastX = x;
    drawState.lastY = y;
    return;
  }

  // 非绘图状态下发送鼠标位置
  if (socket && !state.isDragging) {
    const { x, y } = screenToCanvas(e.offsetX, e.offsetY);
    socket.emit('mouse-move', {
      x,
      y,
      color: myColor,
      roomId: roomId.value
    });
  }
};

// 鼠标抬起
const handleMouseUp = () => {
  if (drawState.isDrawing && ctx) {
    ctx.restore();
  }
  state.isDragging = false;
  drawState.isDrawing = false;
};

// 全屏切换
const toggleFullscreen = () => {
  if (!containerRef.value) return;

  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
};

onMounted(() => {
  // 初始化 WebSocket
  // 动态获取当前主机名，如果前端和后端部署在同一台机器，可以使用 window.location.hostname
  const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : `http://${window.location.hostname}:3001`;
  
  socket = io(serverUrl);
  
  socket.on('connect', () => {
    console.log('Connected to WebSocket server at:', serverUrl);
    if (socket && roomId.value) {
      socket.emit('join-room', roomId.value);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket Connection Error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.warn('WebSocket Disconnected:', reason);
  });

  socket.on('draw', (data) => {
    handleRemoteDraw(data);
    // 更新或创建远程用户光标位置
    remoteUsers.value.set(data.userId, { 
      x: data.x, 
      y: data.y, 
      color: data.color || '#000000' 
    });
  });

  socket.on('mouse-move', (data) => {
    remoteUsers.value.set(data.userId, { 
      x: data.x, 
      y: data.y, 
      color: data.color || '#000000' 
    });
  });

  socket.on('user-disconnected', (userId) => {
    remoteUsers.value.delete(userId);
  });

  socket.on('clear', () => {
    if (ctx && canvasRef.value) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  });

  socket.on('history-sync', (dataUrl) => {
    restoreState(dataUrl, true);
  });

  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value);
    }
    
    resizeCanvas();
    
    // 在组件卸载时断开观察
    onUnmounted(() => {
      resizeObserver.disconnect();
      if (socket) {
        socket.disconnect();
      }
    });
  }
});
</script>

<template>
  <div 
    ref="containerRef" 
    class="canvas-container"
    :class="{
      [`tool-${drawState.activeTool}`]: true,
      'tool-drag': state.isDragging || (!drawState.isDrawing && drawState.activeTool !== 'pen' && drawState.activeTool !== 'eraser')
    }"
    :style="gridStyle"
  >
    <canvas
      ref="canvasRef"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    ></canvas>
    <button class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
      <Maximize2 v-if="!isFullscreen" :size="20" />
      <Minimize2 v-else :size="20" />
    </button>

    <div class="room-info">
      <div class="room-id">房间: {{ roomId }}</div>
      <div class="online-count">
        <Users :size="14" />
        <span>在线: {{ remoteUsers.size + 1 }}</span>
      </div>
    </div>

    <!-- 远程用户光标 -->
    <div 
      v-for="[id, user] in remoteUsers" 
      :key="id" 
      class="remote-cursor-container"
      :style="{
        left: canvasToScreen(user.x, user.y).x + 'px',
        top: canvasToScreen(user.x, user.y).y + 'px',
        color: user.color
      }"
    >
      <MousePointer2 :size="18" fill="currentColor" />
      <div class="cursor-label" :style="{ backgroundColor: user.color }">{{ id.substring(0, 4) }}</div>
    </div>
    
    <TabBar 
      :active-tool="drawState.activeTool"
      :line-width="drawState.lineWidth"
      :color="drawState.color"
      @select-tool="tool => drawState.activeTool = tool"
      @change-line-width="width => drawState.lineWidth = width"
      @change-color="color => drawState.color = color"
      @undo="undo"
      @redo="redo"
      @export="exportImage"
      @share="shareLink"
    />
  </div>
</template>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f5f5f5;
  cursor: auto;
  position: relative;
}

.canvas-container.tool-pen, .canvas-container.tool-eraser {
  cursor: crosshair;
}

.canvas-container.tool-drag {
  cursor: grab;
}

.canvas-container.tool-drag:active {
  cursor: grabbing;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.fullscreen-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.fullscreen-btn:hover {
  background-color: #fff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.room-info {
  position: absolute;
  top: 20px;
  left: 20px;
  padding: 10px 16px;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid #ddd;
  border-radius: 8px;
  z-index: 10;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.online-count {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.remote-cursor-container {
  position: absolute;
  pointer-events: none;
  z-index: 100;
  transition: all 0.1s linear;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.cursor-label {
  margin-top: -2px;
  margin-left: 12px;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
