const query = new URLSearchParams(window.location.search);
const room = query.get('room');
options.urlParam = query.getAll();
const drawWebsocket = {
    websocketInstance: null,
    options: {
        url: '',
        urlParam: {},
        pingTime: 10,//心跳间隔
        timeout: 5,//超时时间
    },
    init(options) {
        this.options.extend({}, this.options, options)
        //检测是否支持websocket
        if (!window.WebSocket) {
            alert('您的浏览器不支持websocket无法参与协作');
            return;
        }
        let url = this.buildUrl()
        this.websocketInstance = new WebSocket(this.options.url)
    },
    buildurl() {
        let url = this.options.url
    },
}

