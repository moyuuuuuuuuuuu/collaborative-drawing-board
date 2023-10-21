const query = new URLSearchParams(window.location.search);
const room = query.get('room');
options.urlParam = query.getAll();
const drawWebsocket = {
    init(options) {
        //检测是否支持websocket
    }
}

