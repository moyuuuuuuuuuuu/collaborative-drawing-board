class DrawSocket {
    options = {
        url: '',
        query: {},
        closeCallback: null,
        connectedCallback: null,
        maxReconnectTimes: 5,
        currentReconnectTimes: 0,
        continueReconnectTimes: 3,
        reconnectInterval: 3000,
        group_id: '',
    }
    drawCanvas = null;

    constructor(options) {
        const that = this;
        //检测是否支持websocket
        if (!window.WebSocket) {
            that.options.closeCallback && that.options.closeCallback(null, '您的浏览器不支持websocket无法参与协作')
            layer.alert('您的浏览器不支持websocket无法参与协作');
            return;
        }
        that.options = Object.assign({}, that.options, options)
        that.init()
    }

    init(isReconnect = false) {
        const that = this;
        if (isReconnect) {
            if (that.options.currentReconnectTimes >= that.options.maxReconnectTimes) {
                console.log('websocket重连次数已达上限')
                return;
            }
            that.options.currentReconnectTimes++;
        }
        let url = that.buildUrl()
        try {
            that.websocketInstance = new WebSocket(url)
            that.websocketInstance.onopen = function (res) {
                that.onOpen(res)
            };
            that.websocketInstance.onmessage = function (res) {
                that.onMessage(res)
            }
            that.websocketInstance.onclose = function (res) {
                that.onClose(res)
            }
            that.websocketInstance.onerror = function (res) {
                that.onError(res)
            }
        } catch (error) {
            layer.msg('连接失败服务器失败，你将不可享受协作功能')
        }

    }

    setDraw(draw) {
        this.draw = draw
    }

    onOpen(res) {
        const that = this;
        that.options.connectedCallback && this.options.connectedCallback(res)
        // that.websocketInstance.send(JSON.stringify({group_id: that.options.group_id, data: {}}));
    }

    onMessage(res) {
        const that = this,
            messageData = JSON.parse(res.data)
        if (messageData.cmd == 'draw') {
            that.draw.drawLine(messageData.drawInfo.startPoint, messageData.drawInfo.endPoint, messageData.drawInfo.clear, messageData.drawInfo.color, messageData.drawInfo.width);
        } else if (messageData.cmd == 'clear') {
            layer.confirm('是否清空画布？', ['是', '否'], () => {
                that.draw.clearCanvas()
                layer.closeAll()
            })
        } else if (messageData.cmd == 'close') {
            layer.msg(messageData.message)
        } else if (messageData.cmd == 'join') {
            layer.msg(messageData.message)
            document.querySelector('.connect-num span').innerHTML = messageData.data.num;
            if (messageData.data.showReloadLayer) {
                that.send(that.options.group_id, {cmd: 'reload'})
            }
        } else if (messageData.cmd == 'leave') {
            layer.msg(messageData.message)
            document.querySelector('.connect-num span').innerHTML = messageData.data.num;
        } else if (messageData.cmd == 'getimg') {
            let img = that.draw.saveImg(true)
            that.send(that.options.group_id, {
                cmd: 'getimg',
                data: {
                    img: img,
                    client_id: messageData.data.client_id
                }
            })
        } else if (messageData.cmd == 'setimg') {
            this.draw.drawWithImg(messageData.data.img)
            layer.closeAll()
        }
    }

    onClose(res) {
        const that = this;
        that.options.closeCallback && that.options.closeCallback(res)
        if (res.code !== -1) {
            console.log('websocket连接被主动关闭')
            return;
        }
    }

    onError(res) {
        const that = this;
        that.options.closeCallback && that.options.closeCallback(res)
    }

    send(groupId, data) {
        const that = this;
        if (that.websocketInstance.readyState !== 1) {
            console.log('websocket未连接')
            return;
        }
        data = Object.assign({}, data, {groupId: groupId})
        that.websocketInstance.send(JSON.stringify(data))
    }

    reload() {
        const that = this;
        that.send(that.options.group_id, {cmd: 'reload'})
    }

    close(code = -1, reason = '客户端主动关闭') {
        const that = this;
        that.websocketInstance.close(Number(code), reason)
    }

    reConnect(isUnmute = false) {
        const that = this;
        if (isUnmute) {
            let interval = setInterval(function () {
                that.init(true)
            }, that.options.reconnectInterval);
        } else {
            that.init(true)
        }
    }

    buildUrl() {
        const that = this;
        let {url, query} = that.options,
            queryString = '';
        query = Object.assign({}, query, new URLSearchParams(window.location.search))
        if (!query.hasOwnProperty('client_id')) {
            query.client_id = Math.random().toString(36).substring(2) + Date.now().toString(36);
        }
        for (let key in query) {
            queryString += `${key}=${query[key]}&`
        }
        queryString = queryString.substring(0, queryString.length - 1)
        return url + '?' + queryString;
    }
}

