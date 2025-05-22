class WebsocketManager {
    constructor(options = {}) {
        this.groupId = options.groupId;
        this.clientId = options.clientId;
        this.userId = options.userId;
        this.username = options.username;
        this.url = options.url || `ws://127.0.0.1:8888/${this.groupId}/${this.clientId}/${this.userId}`;

        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;

        // 用户相关
        this.isManager = false;
        this.memberList = [];
        this.cursors = {};
        this.cursorColor = this.getRandomColor();

        // 回调函数
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onMessage: null,
            onError: null,
            onUserJoin: null,
            onUserLeave: null,
            onDraw: null,
            onCursor: null,
            onUndo: null,
            onRedo: null,
            onKick: null,
            onStrokeLoad: null,
            onBlobRequest: null,
            onBlobReceive: null
        };

        // 消息处理器
        this.messageHandlers = {
            connect: this.handleConnect.bind(this),
            draw: this.handleDraw.bind(this),
            stroke: this.handleStroke.bind(this),
            cursor: this.handleCursor.bind(this),
            join: this.handleJoin.bind(this),
            leave: this.handleLeave.bind(this),
            failure: this.handleFailure.bind(this),
            notice: this.handleNotice.bind(this),
            ping: this.handlePing.bind(this),
            blob: this.handleBlobRequest.bind(this),
            blobToDraw: this.handleBlobReceive.bind(this),
            doUndo: this.handleDoUndo.bind(this),
            doRedo: this.handleDoRedo.bind(this)
        };

        this.init();
    }

    init() {
        this.connect();
        this.startHeartbeat();
    }

    // 建立WebSocket连接
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            this.ws = new WebSocket(this.url);
            this.bindEvents();
        } catch (error) {
            console.error('WebSocket连接失败:', error);
            this.handleReconnect();
        }
    }

    // 绑定WebSocket事件
    bindEvents() {
        this.ws.onopen = this.handleOpen.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = this.handleError.bind(this);
    }

    // 连接打开
    handleOpen() {
        console.log('WebSocket连接已建立');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        if (this.callbacks.onConnect) {
            this.callbacks.onConnect();
        }
    }

    // 处理消息
    handleMessage(event) {
        if (event.data instanceof Blob) {
            this.handleBinaryMessage(event.data);
        } else {
            console.warn('收到非二进制消息:', event.data);
        }
    }

    // 处理二进制消息
    handleBinaryMessage(blob) {
        const reader = new FileReader();
        reader.onload = () => {
            const arrayBuffer = reader.result;
            const dataView = new DataView(arrayBuffer);

            // 读取JSON长度（前4字节）
            const jsonLength = dataView.getUint32(0);

            // 提取JSON数据
            const jsonBytes = new Uint8Array(arrayBuffer, 4, jsonLength);
            const jsonString = new TextDecoder().decode(jsonBytes);
            const meta = JSON.parse(jsonString);

            // 提取二进制数据
            const binaryDataStart = 4 + jsonLength;
            const binaryData = new Uint8Array(arrayBuffer.slice(binaryDataStart));
            const binaryBlob = new Blob([binaryData]);

            const { cmd, message, data } = meta;

            // 调用对应的处理器
            if (this.messageHandlers[cmd]) {
                this.messageHandlers[cmd](message, data, binaryBlob);
            } else {
                console.warn(`未知的命令: ${cmd}`);
            }
        };
        reader.readAsArrayBuffer(blob);
    }

    // 连接关闭
    handleClose(event) {
        console.log('WebSocket连接已关闭:', event.code, event.reason);
        this.isConnected = false;

        if (this.callbacks.onDisconnect) {
            this.callbacks.onDisconnect(event);
        }

        // 尝试重连
        if (event.code !== 1000) { // 非正常关闭
            this.handleReconnect();
        }
    }

    // 连接错误
    handleError(error) {
        console.error('WebSocket错误:', error);

        if (this.callbacks.onError) {
            this.callbacks.onError(error);
        }
    }

    // 重连处理
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`${delay}ms后尝试第${this.reconnectAttempts}次重连...`);

            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('已达到最大重连次数，停止重连');
        }
    }

    // 发送消息
    send(cmd, data = {}, binaryBuffer = null) {
        if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket未连接，无法发送消息');
            return false;
        }

        try {
            const meta = { cmd, data };
            const jsonBytes = new TextEncoder().encode(JSON.stringify(meta));
            const jsonLength = jsonBytes.length;
            const binaryBytes = binaryBuffer ? new Uint8Array(binaryBuffer) : new Uint8Array(0);
            const totalLength = 4 + jsonLength + binaryBytes.length;
            const fullBuffer = new Uint8Array(totalLength);

            // 写入JSON长度（4字节）
            fullBuffer[0] = (jsonLength >>> 24) & 0xff;
            fullBuffer[1] = (jsonLength >>> 16) & 0xff;
            fullBuffer[2] = (jsonLength >>> 8) & 0xff;
            fullBuffer[3] = jsonLength & 0xff;

            // 写入JSON数据
            fullBuffer.set(jsonBytes, 4);

            // 写入二进制数据
            if (binaryBytes.length > 0) {
                fullBuffer.set(binaryBytes, 4 + jsonLength);
            }

            this.ws.send(fullBuffer.buffer);
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    // 消息处理器
    handleConnect(message, data) {
        console.log('连接成功:', message);
        this.isManager = data.isManager;
        this.memberList = data.members || [];

        if (this.callbacks.onConnect) {
            this.callbacks.onConnect(message, data);
        }
    }

    handleDraw(message, data) {
        if (this.callbacks.onDraw) {
            this.callbacks.onDraw(message, data);
        }
    }

    handleStroke(message, data) {
        if (this.callbacks.onStrokeLoad) {
            this.callbacks.onStrokeLoad(message, data);
        }
    }

    handleCursor(message, data) {
        const { userId, x, y, color = '#ff0000', name = '' } = data;

        // 不处理自己的光标
        if (userId === this.userId) return;

        // 更新光标位置
        this.updateRemoteCursor(userId, x, y, color, name);

        if (this.callbacks.onCursor) {
            this.callbacks.onCursor(message, data);
        }
    }

    handleJoin(message, data) {
        console.log('用户加入:', message);
        const member = data.member;
        if (member) {
            this.memberList.push(member);
        }

        if (this.callbacks.onUserJoin) {
            this.callbacks.onUserJoin(message, data);
        }
    }

    handleLeave(message, data) {
        console.log('用户离开:', message);
        const clientId = data.clientId;

        // 从成员列表中移除
        this.memberList = this.memberList.filter(member => member.clientId !== clientId);

        // 移除光标
        this.removeRemoteCursor(data.userId);

        if (this.callbacks.onUserLeave) {
            this.callbacks.onUserLeave(message, data);
        }
    }

    handleFailure(message, data) {
        console.error('操作失败:', message, data);

        if (this.callbacks.onError) {
            this.callbacks.onError(message, data);
        }
    }

    handleNotice(message, data) {
        console.log('通知:', message);

        if (this.callbacks.onMessage) {
            this.callbacks.onMessage(message, data);
        }
    }

    handlePing(message, data) {
        // 响应心跳
        this.send('pong', {});
    }

    handleBlobRequest(message, data) {
        if (this.callbacks.onBlobRequest) {
            this.callbacks.onBlobRequest(message, data);
        }
    }

    handleBlobReceive(message, data, blob) {
        if (this.callbacks.onBlobReceive) {
            this.callbacks.onBlobReceive(message, data, blob);
        }
    }

    handleDoUndo(message, data) {
        if (this.callbacks.onUndo) {
            this.callbacks.onUndo(message, data);
        }
    }

    handleDoRedo(message, data) {
        if (this.callbacks.onRedo) {
            this.callbacks.onRedo(message, data);
        }
    }

    // 远程光标管理
    updateRemoteCursor(userId, x, y, color, name) {
        const cursorContainer = document.getElementById('cursors');
        if (!cursorContainer) return;

        let cursor = this.cursors[userId];
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'cursor';
            cursor.style.position = 'absolute';
            cursor.style.pointerEvents = 'none';
            cursor.style.zIndex = '999';
            cursor.style.fontSize = '12px';
            cursor.style.color = color;
            cursor.style.transform = 'translate(-50%, -50%)';
            cursor.innerHTML = `
                <div style="width:8px;height:8px;background:${color};border-radius:50%;"></div>
                <div style="margin-top:2px;font-size:10px;white-space:nowrap;">${name}</div>
            `;
            cursorContainer.appendChild(cursor);
            this.cursors[userId] = cursor;
        }

        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
    }

    removeRemoteCursor(userId) {
        if (this.cursors[userId]) {
            this.cursors[userId].remove();
            delete this.cursors[userId];
        }
    }

    // 清除所有远程光标
    clearAllRemoteCursors() {
        Object.keys(this.cursors).forEach(userId => {
            this.removeRemoteCursor(userId);
        });
    }

    // 发送绘制数据
    sendDraw(pointData) {
        this.send('draw', pointData);
    }

    // 发送光标位置（使用原始屏幕坐标）
    sendCursor(clientX, clientY) {
        this.send('cursor', {
            userId: this.userId,
            x: clientX,
            y: clientY,
            color: this.cursorColor,
            name: this.username
        });
    }

    // 发送撤销命令
    sendUndo(strokeId) {
        this.send('undo', { strokeId });
    }

    // 发送重做命令
    sendRedo(strokeId) {
        this.send('redo', { strokeId });
    }

    // 发送踢人命令
    sendKick(clientId) {
        this.send('kick', { clientId });
    }

    // 发送快照
    sendSnapshot(binaryBuffer) {
        this.send('snap', {}, binaryBuffer);
    }

    // 发送二进制数据
    sendBlob(clientId, binaryBuffer) {
        this.send('blob', { clientId }, binaryBuffer);
    }

    // 心跳机制
    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected) {
                this.send('ping', {});
            }
        }, 30000); // 30秒发送一次心跳
    }

    // 设置回调函数
    on(event, callback) {
        if (this.callbacks.hasOwnProperty('on' + this.capitalize(event))) {
            this.callbacks['on' + this.capitalize(event)] = callback;
        } else {
            console.warn(`未知的事件类型: ${event}`);
        }
    }

    // 移除回调函数
    off(event) {
        if (this.callbacks.hasOwnProperty('on' + this.capitalize(event))) {
            this.callbacks['on' + this.capitalize(event)] = null;
        }
    }

    // 获取连接状态
    getConnectionState() {
        if (!this.ws) return 'CLOSED';

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return 'CONNECTING';
            case WebSocket.OPEN:
                return 'OPEN';
            case WebSocket.CLOSING:
                return 'CLOSING';
            case WebSocket.CLOSED:
                return 'CLOSED';
            default:
                return 'UNKNOWN';
        }
    }

    // 主动关闭连接
    close(code = 1000, reason = '') {
        if (this.ws) {
            this.ws.close(code, reason);
        }
        this.clearAllRemoteCursors();
    }

    // 重置连接
    reset() {
        this.close();
        this.reconnectAttempts = 0;
        setTimeout(() => {
            this.connect();
        }, 1000);
    }

    // 获取成员列表
    getMemberList() {
        return this.memberList;
    }

    // 是否为管理员
    isManagerUser() {
        return this.isManager;
    }

    // 工具方法
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getRandomColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 调试方法
    getDebugInfo() {
        return {
            connectionState: this.getConnectionState(),
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            memberCount: this.memberList.length,
            isManager: this.isManager,
            cursorsCount: Object.keys(this.cursors).length
        };
    }
}
