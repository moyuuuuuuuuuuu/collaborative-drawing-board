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
            alert('您的浏览器不支持websocket无法参与协作');
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

    }

    onOpen(res) {
        const that = this;
        that.options.connectedCallback && this.options.connectedCallback(res)
        that.websocketInstance.send(JSON.stringify({group_id: that.options.group_id, data: {}}));
    }

    onMessage(res) {
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
        console.log(query)
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

