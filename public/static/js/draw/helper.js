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
}


class ActionStack extends Stack {
}

class RedoStack extends Stack {
}
