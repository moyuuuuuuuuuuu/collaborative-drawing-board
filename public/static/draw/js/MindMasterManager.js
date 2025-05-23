// 2. 思维导图管理器（MindMapManager）
class MindMapManager {
    constructor(canvasManager, options) {
        this.canvasManager = canvasManager;
        this.nodeStacks = new MindMasterNodes();
        this.links = {};
        this.options = options || {};
        this.draggingNode = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.selectedNodeId = null;
        this.selectedNodeClientId = null;
    }

    addNode(text, isNotRootNode = true, clientId = null) {
        if (!clientId) {
            clientId = this.clientId;
        }
        const nodesLength = this.nodeStacks.length(clientId);
        if (nodesLength <= 0 || !isNotRootNode) {
            isNotRootNode = false;
            // 新建一个根节点（无父节点）
            text = '中心主题';
        }
        const node = {
            id: generateSnowId(),
            x: this.canvasManager.canvas.width / 2 + (Math.random() * 200 - 100),
            y: 100 + (Math.random() * 100 - 50),
            data: {
                parent: this.selectedNodeId,
                text: !isNotRootNode ? text : `${text}${nodesLength}`,
                width: 120,
                height: 40,
            },
            type: 1
        }
        this.nodeStacks.push(clientId, node.id, node);
        this.selectedNodeId = node.id;
        this.canvasManager.actionStack.push(clientId, node.id, node);
        this.draw();
    }

    draw() {
        const ctx = this.canvasManager.ctx,
            selectedNodeId = this.selectedNodeId,
            nodes = this.nodeStacks.getAllStrokes();
        if (!nodes) {
            return false;
        }
        ctx.clearRect(0, 0, this.canvasManager.canvas.width, this.canvasManager.canvas.height);
        Object.entries(nodes).forEach(([clientId, nodeMap]) => {
            Object.entries(nodeMap).forEach(([nodeId, node]) => {
                if (node.parent !== null) {
                    const parent = nodeMap[node.data.parent];
                    if (parent) {
                        ctx.beginPath();
                        ctx.moveTo(parent.x, parent.y);
                        ctx.lineTo(node.x, node.y);
                        ctx.strokeStyle = "#888";
                        ctx.stroke();
                    }
                }
                ctx.beginPath();
                ctx.arc(node.x, node.y, 40, 0, Math.PI * 2);
                ctx.fillStyle = (node.id === selectedNodeId) ? "#ffd966" : "#fefefe";
                ctx.fill();
                ctx.strokeStyle = "#333";
                ctx.stroke();

                ctx.fillStyle = "#000";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = "14px Arial";
                ctx.fillText(node.data.text, node.x, node.y);

                // 画选中节点右侧的“加号”按钮
                if (node.id === selectedNodeId) {
                    const plusRadius = 12; // 小圆半径
                    const plusX = node.x + 25 + plusRadius + 5; // 在节点圆右侧一点距离
                    const plusY = node.y;

                    // 小圆圈
                    ctx.beginPath();
                    ctx.arc(plusX, plusY, plusRadius, 0, Math.PI * 2);
                    ctx.fillStyle = "#4CAF50";  // 绿色背景
                    ctx.fill();
                    ctx.strokeStyle = "#2E7D32";
                    ctx.stroke();

                    // 画“+”号，竖线
                    ctx.beginPath();
                    ctx.strokeStyle = "#fff";
                    ctx.lineWidth = 2;
                    ctx.moveTo(plusX, plusY - 6);
                    ctx.lineTo(plusX, plusY + 6);
                    ctx.stroke();

                    // 横线
                    ctx.beginPath();
                    ctx.moveTo(plusX - 6, plusY);
                    ctx.lineTo(plusX + 6, plusY);
                    ctx.stroke();
                }
            })
        })
        this.canvasManager.redrawAll();
    }

    handleMouseDown(e) {
        this.selectDetection(e)
        return this.selectedNodeId;
    }

    handleMouseMove(e) {
        if (!this.draggingNode) return false;
        const rect = this.canvasManager.canvas.getBoundingClientRect(),
            {draggingNode, dragOffsetX, dragOffsetY} = this;
        draggingNode.x = e.clientX - rect.left - dragOffsetX;
        draggingNode.y = e.clientY - rect.top - dragOffsetY;
        this.draw();
        return true;
    }

    handleMouseUp(e) {
        if (!this.draggingNode) return false;
        const {draggingNode} = this;
        this.draggingNode = null;
        // console.log(draggingNode);
        //TODO:把移动之后的节点放回到栈顶 同时还要兼顾undo时能恢复节点到之前的位置
        // this.nodeStacks.push(this.selectedNodeClientId, draggingNode.id, draggingNode);
        return this.selectedNodeId;
    }

    setClientId(clientId) {
        this.clientId = clientId;
    }

    undo(clientId) {
        this.nodeStacks.pop(clientId);
        this.draw();
    }

    selectDetection(e) {
        const rect = this.canvasManager.canvas.getBoundingClientRect(),
            mx = e.clientX - rect.left,
            my = e.clientY - rect.top,
            nodes = this.nodeStacks.getAllStrokes();
        Object.entries(nodes).forEach(([clientId, nodeMap]) => {
            Object.entries(nodeMap).forEach(([nodeId, node]) => {
                const dx = mx - node.x;
                const dy = my - node.y;
                if (dx * dx + dy * dy < 1600) {
                    this.selectedNodeId = node.id;
                    this.draggingNode = node;
                    this.dragOffsetX = dx;
                    this.dragOffsetY = dy;
                    this.selectedNodeClientId = clientId;
                } else {
                    this.selectedNodeId = null;
                    this.selectedNodeClientId = null;
                }
            })
        })
        this.draw();
    }
}
