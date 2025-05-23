class Node {
    constructor(strokeId, points) {
        this.strokeId = strokeId;
        this.points = points;
        this.prev = null;
        this.next = null;
    }
}

class Stack {
    constructor() {
        this.stack = new Map(); // 结构: Map<userId, { head: Node, tail: Node, size: number }>
    }

    push(userId, strokeId, points) {
        if (!this.stack.has(userId)) {
            this.stack.set(userId, {head: null, tail: null, size: 0});
        }

        const userData = this.stack.get(userId);
        const newNode = new Node(strokeId, points);

        if (userData.tail) {
            userData.tail.next = newNode;
            newNode.prev = userData.tail;
            userData.tail = newNode;
        } else {
            userData.head = userData.tail = newNode;
        }

        userData.size++;
    }

    pop(userId) {
        const userData = this.stack.get(userId);
        if (!userData || userData.size === 0) {
            return null;
        }

        const lastNode = userData.tail;

        if (userData.head === userData.tail) {
            userData.head = userData.tail = null;
        } else {
            userData.tail = lastNode.prev;
            if (userData.tail) {
                userData.tail.next = null;
            }
        }

        userData.size--;

        if (userData.size === 0) {
            this.stack.delete(userId);
        }

        return {strokeId: lastNode.strokeId, points: lastNode.points};
    }


    getStrokes(userId) {
        const userData = this.stack.get(userId);
        if (!userData || !userData.head) {
            return {};
        }

        const strokes = {};
        let current = userData.head;

        while (current) {
            strokes[current.strokeId] = current.points;
            current = current.next;
        }

        return strokes;
    }

    clear(userId) {
        this.stack.delete(userId);
    }

    getAllStrokes() {
        const allStrokes = {};

        // 遍历所有用户
        this.stack.forEach((userData, userId) => {
            const userStrokes = {};
            let current = userData.head;

            // 遍历用户的所有节点
            while (current) {
                userStrokes[current.strokeId] = current.points;
                current = current.next;
            }

            allStrokes[userId] = userStrokes;
        });

        return allStrokes;
    }

    length(userId) {
        const userData = this.stack.get(userId);
        return userData ? userData.size : 0;
    }
}


class ActionStack extends Stack {
}

class RedoStack extends Stack {
}

class MindMasterNode extends Node {
    setOriginalPrevStrokeId(strokeId) {
        this.originalPrevStrokeId = strokeId
    }
}

class MindMasterNodes extends Stack {

    push(userId, strokeId, points) {
        if (!this.stack.has(userId)) {
            this.stack.set(userId, {head: null, tail: null, size: 0, nodeMap: new Map()});
        }

        const userData = this.stack.get(userId);
        const newNode = new MindMasterNode(strokeId, points);

        if (userData.tail) {
            userData.tail.next = newNode;
            newNode.prev = userData.tail;
            userData.tail = newNode;
        } else {
            userData.head = userData.tail = newNode;
        }
        userData.nodeMap.set(strokeId, newNode);

        userData.size++;
    }

    getOne(userId, strokeId) {
        const userData = this.stack.get(userId);
        if (!userData) return null;

        let current = userData.head;
        while (current) {
            if (current.strokeId === strokeId) {
                return current.points;
            }
            current = current.next;
        }

        return null; // 没找到对应的 strokeId
    }

    getOneByStrokeId(strokeId) {
        for (const [, userData] of this.stack.entries()) {
            if (userData.nodeMap.has(strokeId)) {
                return userData.nodeMap.get(strokeId);
            }
        }
        return null;
    }

    moveToTopByStrokeId(userId, strokeId) {
        const userData = this.stack.get(userId);
        if (!userData || userData.size < 2) return;

        const node = userData.nodeMap.get(strokeId);
        if (!node || node === userData.tail) return; // 已在栈顶，无需处理

        // 移除节点
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;

        if (node === userData.head) {
            userData.head = node.next;
        }

        // 插入到尾部
        node.prev = userData.tail;
        node.next = null;
        userData.tail.next = node;
        userData.tail = node;
    }
}
