class CanvasManager {
    constructor(canvasId, bgCanvasId, options = {}, actionStack, redoStack, layer) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.bgCanvas = document.getElementById(bgCanvasId);
        this.bgCtx = this.bgCanvas.getContext('2d');

        // 缩放相关属性
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.minScale = 0.1;
        this.maxScale = 5;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.startTranslateX = 0;
        this.startTranslateY = 0;
        // 绘制相关属性
        this.isDrawing = false;
        this.isDragging = false;
        this.isErasing = false;
        this.color = options.color || '#000000';
        this.size = options.size || 5;
        this.currentPath = {clientId: null, strokeId: null, points: []};

        this.mindMap = new MindMapManager(this);
        // 动作栈
        this.actionStack = actionStack;
        this.redoStack = redoStack;

        this.layer = layer;

        // 样式相关
        this.currentStyle = 'default';
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.bindEvents();
        this.clearBackground('#ffffff');
    }

    resizeCanvas(isFirst = true) {
        const pixelRatio = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 设置canvas实际大小
        this.canvas.width = width * pixelRatio;
        this.canvas.height = height * pixelRatio;
        this.bgCanvas.width = width * pixelRatio;
        this.bgCanvas.height = height * pixelRatio;

        // 设置canvas显示大小
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.bgCanvas.style.width = width + 'px';
        this.bgCanvas.style.height = height + 'px';

        // 缩放上下文以适应高DPI屏幕
        this.ctx.scale(pixelRatio, pixelRatio);
        this.bgCtx.scale(pixelRatio, pixelRatio);

        if (!isFirst) {
            this.redrawAll();
        }
    }

    bindEvents() {
        // 绘制事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // 缩放事件
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        // 触摸事件（移动端支持）
        /* this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
         this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
         this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));*/

        this.canvas.addEventListener('click', this.handleClick.bind(this))

        // 窗口大小变化
        window.addEventListener('resize', () => this.resizeCanvas(false));
    }

    // 鼠标事件处理
    handleMouseDown(e) {
        e.preventDefault();
        if (e.button === 0 && e.ctrlKey) {
            this.isDragging = true;
            //开始移动画布
            this.setCursor('grabbing')
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.startTranslateX = this.translateX;
            this.startTranslateY = this.translateY;
        } else {
            if (!this.mindMap.handleMouseDown(e)) {
                // 如果节点未被点击（返回 false），重新进入绘图模式
                this.isDrawing = true;
                this.startDrawing(e.clientX, e.clientY);
            }
        }
    }

    handleMouseMove(e) {
        e.preventDefault();
        if (this.isDragging) {
            const dx = e.clientX - this.dragStartX;
            const dy = e.clientY - this.dragStartY;

            // 注意：以拖拽起点为锚点
            this.translateX = this.startTranslateX + dx;
            this.translateY = this.startTranslateY + dy;

            this.redrawAll();
            return;
        } else {
            if (!this.mindMap.handleMouseMove(e)) {
                this.continueDraw(e.clientX, e.clientY); // 传递原始客户端坐标
            }
        }

        // 更新鼠标光标位置
        this.updateCursor(e.clientX, e.clientY);

        // 通知WebSocket管理器发送光标位置（使用原始坐标）
        if (this.onCursorMove) {
            this.onCursorMove(e.clientX, e.clientY);
        }
    }

    handleMouseUp(e) {
        e.preventDefault();
        if (this.isDragging) {
            this.isDragging = false;
            this.setCursor('default');
        } else if (!this.mindMap.handleMouseUp(e)) {
            this.endDrawing();
        }
    }

// 触摸事件处理
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.startDrawing(touch.clientX, touch.clientY); // 传递原始坐标
        }
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1 && this.isDrawing) {
            const touch = e.touches[0];
            this.continueDraw(touch.clientX, touch.clientY); // 传递原始坐标
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.endDrawing();
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 先判断是否点击了加号
        if (this.mindMap.selectedNodeId !== null) {
            const node = this.mindMap.nodeStacks.getOneByStrokeId(this.mindMap.selectedNodeId)?.points;
            if (node) {
                const plusRadius = 12;
                const plusX = node.x + 25 + plusRadius + 5;
                const plusY = node.y;

                const dx = mx - plusX;
                const dy = my - plusY;
                if (dx * dx + dy * dy <= plusRadius * plusRadius) {
                    // 点击了加号
                    this.mindMap.addNode('节点');
                    return;
                }
            }
            return ;
        }
        this.mindMap.selectedNodeId = null;
        this.mindMap.selectDetection(e)
    }

// 滚轮缩放处理
    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoom = e.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * zoom));

        if (newScale !== this.scale) {
            // 计算缩放中心点
            const scaleChange = newScale / this.scale;
            this.translateX = mouseX - (mouseX - this.translateX) * scaleChange;
            this.translateY = mouseY - (mouseY - this.translateY) * scaleChange;
            this.scale = newScale;

            this.redrawAll();
        }
        if (this.onZoomChange) {
            this.onZoomChange(this.scale);
        }

    }

// 获取canvas坐标点（考虑缩放和平移）
    getCanvasPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left - this.translateX) / this.scale;
        const y = (clientY - rect.top - this.translateY) / this.scale;
        return {x, y};
    }

// 获取原始canvas坐标（不受缩放影响，用于网络传输）
    getRawCanvasPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        return {x, y};
    }

// 将原始坐标转换为当前缩放下的显示坐标
    transformRawPoint(rawX, rawY) {
        const x = (rawX - this.translateX) / this.scale;
        const y = (rawY - this.translateY) / this.scale;
        return {x, y};
    }

// 开始绘制
    startDrawing(x, y) {
        this.isDrawing = true;
        this.currentPath = {
            clientId: this.clientId,
            strokeId: generateSnowId(),
            points: []
        };

        const drawColor = this.isErasing ? '#FFFFFF' : this.color;

        // 使用原始坐标进行网络传输
        const rawPoint = this.getRawCanvasPoint(x, y);
        const point = {
            id: generateSnowId(),
            x: rawPoint.x,
            y: rawPoint.y,
            color: drawColor,
            size: this.size,
            isStart: true,
            strokeId: this.currentPath.strokeId,
            type: 0
        };

        // 本地绘制使用变换后的坐标
        const localPoint = this.getCanvasPoint(x, y);
        this.ctx.save();
        this.applyTransform();
        this.ctx.beginPath();
        this.ctx.moveTo(localPoint.x, localPoint.y);
        this.ctx.restore();

        this.currentPath.points.push(point);

        // 通知WebSocket管理器
        if (this.onDrawStart) {
            this.onDrawStart(point);
        }
    }

// 继续绘制
    continueDraw(x, y) {
        if (!this.isDrawing) return;

        const drawColor = this.isErasing ? '#FFFFFF' : this.color;

        // 使用原始坐标进行网络传输
        const rawPoint = this.getRawCanvasPoint(x, y);
        const point = {
            id: generateSnowId(),
            x: rawPoint.x,
            y: rawPoint.y,
            color: drawColor,
            size: this.size,
            isStart: false,
            strokeId: this.currentPath.strokeId,
            type: 0
        };

        // 本地绘制使用变换后的坐标
        const localPoint = this.getCanvasPoint(x, y);
        this.ctx.save();
        this.applyTransform();
        this.ctx.strokeStyle = drawColor;
        this.ctx.lineWidth = this.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineTo(localPoint.x, localPoint.y);
        this.ctx.stroke();
        this.ctx.restore();

        this.currentPath.points.push(point);

        // 通知WebSocket管理器
        if (this.onDrawContinue) {
            this.onDrawContinue(point);
        }
    }

// 结束绘制
    endDrawing() {
        if (this.isDrawing && this.currentPath.points.length > 0) {
            // 通知WebSocket管理器
            if (this.onDrawEnd) {
                this.onDrawEnd({
                    isEnd: true,
                    strokeId: this.currentPath.strokeId
                });
            }

            // 添加到动作栈
            if (this.currentPath.points.length > 0) {
                this.actionStack.push(
                    this.currentPath.clientId,
                    this.currentPath.strokeId,
                    this.currentPath.points
                );
            }

            this.currentPath = {clientId: null, strokeId: null, points: []};
        }
        this.isDrawing = false;
        this.ctx.beginPath();
    }

// 应用变换（缩放和平移）
    applyTransform() {
        this.ctx.translate(this.translateX, this.translateY);
        this.ctx.scale(this.scale, this.scale);
    }

// 绘制远程笔画
    drawRemoteStroke(data) {
        if (!data) return;

        const {x, y, color, size, isStart} = data;

        this.ctx.save();
        this.applyTransform();
        this.ctx.strokeStyle = color || '#000';
        this.ctx.lineWidth = size || 2;
        this.ctx.lineCap = 'round';

        if (isStart) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        } else {
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

// 重绘所有内容
    redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.applyTransform();
        const allStrokes = this.actionStack.getAllStrokes();
        Object.entries(allStrokes).forEach(([clientId, strokes]) => {
            Object.entries(strokes).forEach(([strokeId, points]) => {
                if (!points || points.length === 0) return;
                if (points.hasOwnProperty('data')) {
                    return false;
                }

                this.ctx.beginPath();
                points.forEach((pointData, index) => {
                    const {x, y, isStart, color, size} = pointData;
                    this.ctx.strokeStyle = color;
                    this.ctx.lineWidth = size;
                    this.ctx.lineCap = 'round';
                    if (isStart || index === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                });

                this.ctx.stroke();
                this.ctx.closePath();
            });
        });
        this.ctx.restore();
    }

// 撤销操作
    undo(clientId = null, toServer = true) {
        clientId = clientId || this.clientId;
        try {
            const {strokeId, points} = this.actionStack.pop(clientId);
            if (strokeId) {
                this.redoStack.push(clientId, strokeId, points);
                if (toServer && this.onUndo) {
                    this.onUndo({strokeId});
                }
            }
            this.redrawAll();
            return true;
        } catch (e) {
            console.warn(e);
            return false;
        }
    }

// 重做操作
    redo(clientId = null, toServer = true) {
        clientId = clientId || this.clientId;
        try {
            const {strokeId, points} = this.redoStack.pop(clientId);
            if (strokeId) {
                this.actionStack.push(clientId, strokeId, points);
                if (toServer && this.onRedo) {
                    this.onRedo({strokeId});
                }
            }
            this.redrawAll();
            return true;
        } catch (e) {
            console.warn(e);
            return false;
        }
    }

// 设置工具模式
    setPenMode() {
        this.isDragMode = this.isDragging = this.isErasing = false;
        this.updateCursorStyle();
    }

    setEraserMode() {
        this.isErasing = true;
        this.isDragging = false;
        this.updateCursorStyle();
    }

    setDragMode() {
        this.isDragMode = true;
        this.updateCursorStyle();
    }

// 设置颜色
    setColor(color) {
        this.color = color;
        this.updateCursorStyle();
    }

// 设置画笔大小
    setSize(size) {
        this.size = Math.max(1, Math.min(30, size));
        this.updateCursorStyle();
    }

    setCursor(type) {
        this.canvas.style.cursor = type;
    }

// 更新光标样式
    updateCursorStyle() {
        const pencil = document.getElementById('pencil');
        if (this.isDragMode) {
            pencil.style.display = 'none';
            this.setCursor('grab')
            return;
        }
        this.setCursor('none')
        if (pencil) {
            pencil.style.display = 'block';
            pencil.style.width = this.size + 'px';
            pencil.style.height = this.size + 'px';
            pencil.style.borderColor = this.color;
            pencil.style.borderRadius = this.isErasing ? '0' : '50%';
        }

    }

// 更新光标位置
    updateCursor(clientX, clientY) {
        const pencil = document.getElementById('pencil');
        if (pencil) {
            if (!this.isDragMode) {
                pencil.style.display = 'block';
            }
            pencil.style.top = (clientY - this.size / 2) + 'px';
            pencil.style.left = (clientX - this.size / 2) + 'px';
        }
    }

// 设置背景样式
    setBackgroundStyle(style) {
        this.currentStyle = style;
        switch (style) {
            case 'gray':
                this.clearBackground('#cccccc');
                break;
            case 'green':
                this.clearBackground('#dfeee2');
                break;
            case 'default':
                this.clearBackground('#ffffff');
                break;
        }
    }

// 清除背景
    clearBackground(fillColor = '#ffffff') {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.bgCtx.fillStyle = fillColor;
        this.bgCtx.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
    }

// 加载笔画数据
    loadStrokes(strokeList, reDraw = false) {
        Object.entries(strokeList).forEach(([clientId, strokes]) => {
            Object.entries(strokes).forEach(([strokeId, points]) => {
                this.actionStack.push(clientId, strokeId, points);
            });
        });

        if (reDraw) {
            this.redrawAll();
        }
    }

// 缩放功能
    zoomIn() {
        const newScale = Math.min(this.maxScale, this.scale * 1.2);
        this.setZoom(newScale);
    }

    zoomOut() {
        const newScale = Math.max(this.minScale, this.scale / 1.2);
        this.setZoom(newScale);
    }

    resetZoom() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.redrawAll();
    }

    setZoom(scale) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        const scaleChange = scale / this.scale;
        this.translateX = centerX - (centerX - this.translateX) * scaleChange;
        this.translateY = centerY - (centerY - this.translateY) * scaleChange;
        this.scale = scale;

        this.redrawAll();
    }

// 导出canvas为blob
    toBlob(callback, type = 'image/png') {
        this.canvas.toBlob(callback, type);
    }

// 从blob加载图像
    loadFromBlob(blob) {
        const img = new Image();
        img.onload = () => {
            this.ctx.save();
            this.applyTransform();
            this.ctx.drawImage(img, 0, 0);
            this.ctx.restore();
            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(blob);
    }

// 设置客户端ID
    setClientId(clientId) {
        this.clientId = clientId;
        this.mindMap.setClientId(clientId);
    }

// 清除用户数据
    clearUserData(clientId) {
        this.actionStack.clearUser && this.actionStack.clearUser(clientId);
        this.redoStack.clear && this.redoStack.clear(clientId);
    }
}
