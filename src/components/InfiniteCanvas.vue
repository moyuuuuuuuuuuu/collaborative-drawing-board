<script setup lang="ts">
import {ref, onMounted, onUnmounted, reactive, computed} from 'vue';
import {io, Socket} from 'socket.io-client';
import TabBar from './TabBar.vue';
import {MousePointer2, Maximize2, Minimize2, Users, HelpCircle, X} from 'lucide-vue-next';

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
interface Point {
  x: number;
  y: number;
}

interface Path {
  id: string;
  userId: string;
  points: Point[];
  color: string | null; // null for eraser
  lineWidth: number;
  tool: string;
}

const paths = ref<Path[]>([]);
const currentPath = ref<Path | null>(null);

interface Action {
  type: 'add' | 'remove';
  path: Path;
}

const history = reactive<{
  undoStack: Action[];
  redoStack: Action[];
}>({
  undoStack: [],
  redoStack: [],
});

// 生成随机颜色给光标
const myColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

// 绘图状态
const drawState = reactive({
  activeTool: 'pen',
  isDrawing: false,
  color: '#000000',
  lineWidth: 2,
  lastX: 0,
  lastY: 0,
  mouseX: 0,
  mouseY: 0,
  showCursor: false,
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

// 保存操作到撤销栈
const saveHistory = (action: Action) => {
  history.undoStack.push(JSON.parse(JSON.stringify(action)));
  if (history.undoStack.length > 50) {
    history.undoStack.shift();
  }
  history.redoStack = [];
};

// 撤销
const undo = () => {
  if (history.undoStack.length === 0) return;

  const action = history.undoStack.pop();
  if (!action) return;

  if (action.type === 'add') {
    // 撤销“添加”：从 paths 中移除该路径
    const index = paths.value.findIndex(p => p.id === action.path.id);
    if (index !== -1) {
      paths.value.splice(index, 1);
      history.redoStack.push(action);
    }
  } else if (action.type === 'remove') {
    // 撤销“移除”：将路径加回 paths
    paths.value.push(action.path);
    history.redoStack.push(action);
  }

  draw();
  syncHistory();
};

// 反撤销
const redo = () => {
  if (history.redoStack.length === 0) return;

  const action = history.redoStack.pop();
  if (!action) return;

  if (action.type === 'add') {
    // 重做“添加”：将路径加回 paths
    paths.value.push(action.path);
    history.undoStack.push(action);
  } else if (action.type === 'remove') {
    // 重做“移除”：从 paths 中移除该路径
    const index = paths.value.findIndex(p => p.id === action.path.id);
    if (index !== -1) {
      paths.value.splice(index, 1);
      history.undoStack.push(action);
    }
  }

  draw();
  syncHistory();
};

const syncHistory = () => {
  if (socket) {
    socket.emit('history-sync', {roomId: roomId.value, paths: JSON.parse(JSON.stringify(paths.value))});
  }
};

// 恢复画布状态
const restoreState = (newPaths: Path[], isRemote: boolean = false) => {
  paths.value = newPaths;
  draw();

  if (!isRemote) {
    syncHistory();
  }
};

// 导出为图片
const exportImage = () => {
  if (!canvasRef.value || !ctx) return;

  // 创建一个临时画布，只包含当前的绘制内容（不带缩放和偏移）
  // 找到所有点范围以确定大小
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  paths.value.forEach(p => {
    p.points.forEach(pt => {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    });
  });

  // 如果没有内容，直接导出当前视图
  if (minX === Infinity) {
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = canvasRef.value.toDataURL();
    link.click();
    return;
  }

  const padding = 20;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = maxX - minX + padding * 2;
  exportCanvas.height = maxY - minY + padding * 2;
  const eCtx = exportCanvas.getContext('2d');

  if (eCtx) {
    eCtx.fillStyle = '#ffffff'; // 设置背景色
    eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    eCtx.translate(-minX + padding, -minY + padding);

    // 借用 drawPath 函数的思想，或者直接在这里实现
    paths.value.forEach(path => {
      if (path.points.length < 2) return;
      const firstPoint = path.points[0];
      if (!firstPoint) return;

      eCtx.beginPath();
      eCtx.moveTo(firstPoint.x, firstPoint.y);
      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i];
        if (point) {
          eCtx.lineTo(point.x, point.y);
        }
      }
      eCtx.lineCap = 'round';
      eCtx.lineJoin = 'round';
      if (path.tool === 'eraser') {
        eCtx.globalCompositeOperation = 'destination-out';
        eCtx.lineWidth = path.lineWidth * 5;
      } else {
        eCtx.globalCompositeOperation = 'source-over';
        eCtx.strokeStyle = path.color || '#000000';
        eCtx.lineWidth = path.lineWidth;
      }
      eCtx.stroke();
    });

    const link = document.createElement('a');
    link.download = 'drawing-export.png';
    link.href = exportCanvas.toDataURL();
    link.click();
  }
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
    canvasRef.value.width = containerRef.value.clientWidth;
    canvasRef.value.height = containerRef.value.clientHeight;

    // 重新绘制背景和已有的内容
    draw();
  }
};

// 坐标转换：屏幕坐标转画布坐标
const screenToCanvas = (screenX: number, screenY: number) => {
  const x = (screenX - state.offsetX) / state.scale;
  const y = (screenY - state.offsetY) / state.scale;
  return {x, y};
};

// 绘制网格背景（模拟无限感）
// 已在 gridStyle 中实现，此处暂不需要

// 计算跟随圆圈样式
const brushCursorStyle = computed(() => {
  if (!drawState.showCursor || state.isDragging) return {display: 'none'};

  const isEraser = drawState.activeTool === 'eraser';
  const isPen = drawState.activeTool === 'pen';

  if (!isEraser && !isPen) return {display: 'none'};

  // 橡皮擦宽度在绘制时是 lineWidth * 5
  const baseSize = isEraser ? drawState.lineWidth * 5 : drawState.lineWidth;
  const size = baseSize * state.scale;

  return {
    left: `${drawState.mouseX}px`,
    top: `${drawState.mouseY}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderColor: isEraser ? '#666' : drawState.color,
    backgroundColor: isEraser ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
    display: 'block'
  };
});

// 绘制函数
const draw = () => {
  if (!ctx || !canvasRef.value) return;

  // 清除画布
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);

  // 应用变换
  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);

  // 绘制所有路径
  paths.value.forEach(path => {
    drawPath(path);
  });

  // 绘制当前正在画的路径
  if (currentPath.value) {
    drawPath(currentPath.value);
  }
};

const drawPath = (path: Path) => {
  if (!ctx || path.points.length < 2) return;

  const firstPoint = path.points[0];
  if (!firstPoint) return;

  ctx.beginPath();
  ctx.moveTo(firstPoint.x, firstPoint.y);

  for (let i = 1; i < path.points.length; i++) {
    const point = path.points[i];
    if (point) {
      ctx.lineTo(point.x, point.y);
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (path.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = (path.lineWidth * 5); // 橡皮擦
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = path.color || '#000000';
    ctx.lineWidth = path.lineWidth;
  }

  ctx.stroke();
};

// 坐标转换：画布坐标转屏幕坐标
const canvasToScreen = (canvasX: number, canvasY: number) => {
  const x = canvasX * state.scale + state.offsetX;
  const y = canvasY * state.scale + state.offsetY;
  return {x, y};
};

// 处理来自远程的绘制数据
const handleRemoteDraw = (data: any) => {
  let path = paths.value.find(p => p.id === data.pathId);
  if (!path) {
    path = {
      id: data.pathId,
      userId: data.userId,
      points: [{x: data.lastX, y: data.lastY}],
      color: data.color,
      lineWidth: data.lineWidth,
      tool: data.tool
    };
    paths.value.push(path);
  }
  path.points.push({x: data.x, y: data.y});
  draw();
};

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
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
      drawState.isDrawing = true;
      const {x, y} = screenToCanvas(e.offsetX, e.offsetY);
      drawState.lastX = x;
      drawState.lastY = y;

      currentPath.value = {
        id: Math.random().toString(36).substring(2, 9),
        userId: socket?.id || 'local',
        points: [{x, y}],
        color: drawState.activeTool === 'eraser' ? null : drawState.color,
        lineWidth: drawState.lineWidth,
        tool: drawState.activeTool
      };

      draw();
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
  drawState.mouseX = e.clientX;
  drawState.mouseY = e.clientY;
  drawState.showCursor = true;

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

  if (drawState.isDrawing && currentPath.value) {
    const {x, y} = screenToCanvas(e.offsetX, e.offsetY);
    currentPath.value.points.push({x, y});
    draw();

    // 发送绘图数据
    if (socket) {
      socket.emit('draw', {
        pathId: currentPath.value.id,
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
    const {x, y} = screenToCanvas(e.offsetX, e.offsetY);
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
  if (drawState.isDrawing && currentPath.value) {
    paths.value.push(currentPath.value);

    // 保存到历史记录：当前用户添加了一个路径
    saveHistory({type: 'add', path: currentPath.value});

    currentPath.value = null;
    draw();

    // 发送绘图结束信号，以便其他客户端保存历史记录
    if (socket) {
      socket.emit('draw-end', {roomId: roomId.value});
    }
  }
  state.isDragging = false;
  drawState.isDrawing = false;
};

// 帮助弹窗
const showHelp = ref(false);

// 全屏状态
const isFullscreen = ref(false);

// 全屏切换
const toggleFullscreen = () => {
  if (!containerRef.value) return;

  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen()
        .then(() => {
          isFullscreen.value = true;
        })
        .catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
  } else {
    document.exitFullscreen().then(() => {
      isFullscreen.value = false;
    });
  }
};

// 监听全屏变化
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);

  const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001'
      : 'https://collaborative-drawing-board-8e6n.onrender.com'; // 替换成你真实的后端云服务地址

// 提示：生产环境必须用 https:// (对于 Socket.IO 对应的是 wss)
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'] // 增加稳定性
  });

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
    paths.value = [];
    currentPath.value = null;
    history.undoStack = [];
    history.redoStack = [];
    draw();
  });

  socket.on('draw-end', () => {
    // 之前这里会调用 saveHistory()，现在不需要了，因为撤销栈是私有的
    // 只有自己画的才进自己的撤销栈
  });

  socket.on('history-sync', (data) => {
    if (data.paths) {
      restoreState(data.paths, true);
    } else if (typeof data === 'string') {
      // 兼容旧版本的同步（如果是 dataURL）
      // 虽然现在改为 vector 了，但如果对方还没刷新页面可能会发 dataURL
      // 不过由于我把 restoreState 改了，这里需要处理一下
      console.warn('Received old style history sync (dataURL), ignoring.');
    }
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
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
      'tool-drag': state.isDragging || (!drawState.isDrawing && drawState.activeTool !== 'pen' && drawState.activeTool !== 'eraser'),
      'dragging': state.isDragging
    }"
      :style="gridStyle"
  >
    <canvas
        ref="canvasRef"
        @wheel="handleWheel"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="() => { handleMouseUp(); drawState.showCursor = false; }"
        @mouseenter="drawState.showCursor = true"
    ></canvas>

    <!-- 跟随鼠标的圆圈 -->
    <div
        class="brush-cursor"
        :style="brushCursorStyle"
    ></div>
    <div class="top-right-controls">
      <button class="fullscreen-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
        <Maximize2 v-if="!isFullscreen" :size="20"/>
        <Minimize2 v-else :size="20"/>
      </button>
      <button class="help-btn" @click="showHelp = true" title="快捷键帮助">
        <HelpCircle :size="20"/>
      </button>
    </div>

    <!-- 帮助弹窗 -->
    <Transition name="fade">
      <div v-if="showHelp" class="modal-overlay" @click.self="showHelp = false">
        <div class="help-modal">
          <div class="modal-header">
            <h3>快捷键与操作指南</h3>
            <button class="close-btn" @click="showHelp = false">
              <X :size="20"/>
            </button>
          </div>
          <div class="modal-body">
            <div class="shortcut-item">
              <span class="key">左键拖拽</span>
              <span class="desc">在画笔/橡皮擦模式下绘图</span>
            </div>
            <div class="shortcut-item">
              <span class="key">滚轮</span>
              <span class="desc">以鼠标为中心缩放画布</span>
            </div>
            <div class="shortcut-item">
              <span class="key">中键拖拽</span>
              <span class="desc">移动/平移画布</span>
            </div>
            <div class="shortcut-item">
              <span class="key">Alt + 左键</span>
              <span class="desc">移动/平移画布</span>
            </div>
            <div class="shortcut-item">
              <span class="key">点击工具图标</span>
              <span class="desc">再次点击画笔/橡皮可调节粗细</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div class="room-info">
      <div class="room-id">房间: {{ roomId }}</div>
      <div class="online-count">
        <Users :size="14"/>
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
      <MousePointer2 :size="18" fill="currentColor"/>
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

.canvas-container.tool-pen:not(.dragging) canvas,
.canvas-container.tool-eraser:not(.dragging) canvas {
  cursor: none;
}

.canvas-container.tool-drag canvas {
  cursor: grab !important;
}

.canvas-container.tool-drag.dragging canvas {
  cursor: grabbing !important;
}

.brush-cursor {
  position: fixed;
  pointer-events: none;
  border: 1px solid rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 100;
  display: none;
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
}

.top-right-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 100;
}

.fullscreen-btn, .help-btn {
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
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .fullscreen-btn, .help-btn {
    background-color: rgba(30, 30, 30, 0.9);
    border-color: #444;
    color: #eee;
  }
}

.fullscreen-btn:hover, .help-btn:hover {
  background-color: #fff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  .fullscreen-btn:hover, .help-btn:hover {
    background-color: #333;
  }
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(2px);
}

.help-modal {
  background: white;
  width: 90%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: modal-in 0.3s ease-out;
}

@media (prefers-color-scheme: dark) {
  .help-modal {
    background: #1e1e1e;
    color: #eee;
  }
}

@keyframes modal-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
}

@media (prefers-color-scheme: dark) {
  .modal-header {
    background: #252525;
    border-bottom-color: #333;
  }
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .modal-header h3 {
    color: #eee;
  }
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  transition: background 0.2s;
}

@media (prefers-color-scheme: dark) {
  .close-btn {
    color: #aaa;
  }
}

.close-btn:hover {
  background: #eee;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .close-btn:hover {
    background: #333;
    color: #eee;
  }
}

.modal-body {
  padding: 10px 20px 20px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  margin-top: 15px;
  gap: 15px;
}

.key {
  background: #f1f3f5;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
  min-width: 90px;
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .key {
    background: #2a2a2a;
    border-color: #444;
    color: #ccc;
  }
}

.desc {
  font-size: 0.9rem;
  color: #666;
  flex: 1;
}

@media (prefers-color-scheme: dark) {
  .desc {
    color: #aaa;
  }
}

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .room-info {
    background-color: rgba(30, 30, 30, 0.9);
    border-color: #444;
    color: #eee;
  }
}

.online-count {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (prefers-color-scheme: dark) {
  .online-count {
    color: #aaa;
  }
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
</style>
