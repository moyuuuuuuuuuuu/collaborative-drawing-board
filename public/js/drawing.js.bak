class Drawing {
    canvas = null
    ctx = null
    activeColor = 'black'
    lWidth = 5
    groupId = 0
    clear = false
    listenDom = {
        eraser: document.getElementById('eraser'),
        brush: document.getElementById('brush'),
        clear: document.getElementById('clear'),
        aColorBtn: document.getElementsByClassName('color-item'),
        save: document.getElementById('save'),
        undo: document.getElementById('undo'),
        range: document.getElementById('range'),
        share: document.getElementById('share'),
        cursor: document.getElementById('cursor')
    }
    history = {}
    deviceWidth = window.screen.width
    isPainting = false
    isMovingScreen = false
    trailId = ''
    originalPoint = {
        x: 0,
        y: 0
    }
    move = {
        x: 0,
        y: 0
    }

    constructor(websocket, canvas, groupId = 0) {
        const that = this;
        that.initCanvas(canvas);
        that.addListener();
        that.websocket = websocket
        that.groupId = groupId
    }

    addListener() {
        const that = this;

        //橡皮擦监听
        if (that.listenDom.hasOwnProperty('eraser')) {
            that.listenDom.eraser.addEventListener('click', function () {
                that.clear = true;
                this.classList.add("active");
                that.listenDom.brush.classList.remove("active");
            })
        }
        //画笔监听
        if (that.listenDom.hasOwnProperty('brush')) {
            that.listenDom.brush.addEventListener('click', function () {
                that.clear = false;
                this.classList.add("active");
                that.listenDom.eraser.classList.remove("active");
            })
        }
        //清空画布监听
        if (that.listenDom.hasOwnProperty('clear')) {
            that.listenDom.clear.addEventListener('click', function () {
                layer.confirm('是否清空画布？', ['是', '否'], () => {
                    that.clearCanvas()
                    that.websocket.send(that.groupId, {
                        cmd: 'clear'
                    });
                    layer.closeAll()
                })

            })
        }
        //颜色监听
        if (that.listenDom.hasOwnProperty('aColorBtn')) {
            for (let i = 0; i < that.listenDom.aColorBtn.length; i++) {
                that.listenDom.aColorBtn[i].addEventListener('click', function () {
                    for (let i = 0; i < that.listenDom.aColorBtn.length; i++) {
                        that.listenDom.aColorBtn[i].classList.remove("active");
                        this.classList.add("active");
                        that.activeColor = this.style.backgroundColor;
                        that.ctx.fillStyle = that.activeColor;
                        that.ctx.strokeStyle = that.activeColor;
                    }
                })
            }
        }
        //保存监听
        if (that.listenDom.hasOwnProperty('save')) {
            that.listenDom.save.addEventListener('click', function () {
                that.saveImg();
            });
        }
        //撤销监听
        if (that.listenDom.hasOwnProperty('undo')) {
            that.listenDom.undo.addEventListener('click', function () {
                if (that.history.length < 1) return false;
                that.undo();
            });
        }
        //线条粗细监听
        if (that.listenDom.hasOwnProperty('range')) {
            that.listenDom.range.addEventListener('change', function () {
                that.changePaintRange(this.value)
            });
        }
        //分享监听
        if (that.listenDom.hasOwnProperty('share')) {
            that.listenDom.share.addEventListener('click', function () {
                //组装url并复制到剪切板
                let url = window.location.href;
                if (!url.includes('r=')) {
                    if (url.includes('?')) {
                        url += '&r=' + that.groupId
                    } else {
                        url += '?r=' + that.groupId
                    }
                }

                let input = document.createElement('input');
                document.body.appendChild(input);
                input.setAttribute('value', url);
                input.select();
                if (document.execCommand('copy')) {
                    document.execCommand('copy');
                    layer.msg('分享链接已复制到剪切板');
                }
            });
        }


        let oldMove = {x: 0, y: 0};
        //鼠标移动及canvas绘画监听
        if (document.body.ontouchstart !== undefined) {
            document.body.addEventListener('touchstart', function (e) {
                that.touchStart(e);
                oldMove = that.move;
                setTimeout(that.longPress(e), 500);
            });
            that.canvas.addEventListener('touchmove', function (e) {
                if (that.listenDom.cursor) {
                    that.corsorMove(e.pageX, e.pageY);
                }
                if (that.isPainting) {
                    that.touchMove(e);
                } else if (that.isMovingScreen) {
                    //平移画布
                    that.movingScreen(e, oldMove);
                }
                e.preventDefault();
            });
            document.body.addEventListener('touchend', function (e) {
                that.touchend(e);
            });
        } else {
            document.body.addEventListener('mousedown', function (e) {
                that.touchStart(e);

                oldMove = that.move;
            });
            that.canvas.addEventListener('mousemove', function (e) {
                if (that.listenDom.cursor) {
                    that.corsorMove(e.pageX, e.pageY);
                }
                if (that.isPainting) {
                    that.touchMove(e);
                } else if (that.isMovingScreen) {
                    that.movingScreen(e, oldMove);
                }
                e.preventDefault();
            });
            document.body.addEventListener('mouseup', function (e) {
                that.touchend(e);
            });
        }

        document.onkeydown = function (e) {
            var evtobj = window.event ? event : e
            if (evtobj.keyCode == 90 && evtobj.ctrlKey) {
                that.undo()
            } else if (evtobj.keyCode == 83 && evtobj.ctrlKey) {
                that.saveImg();
            }
        };

        document.oncontextmenu = function (e) {
            e.preventDefault()
        }

    }

    initCanvas(canvas) {
        const that = this;
        that.canvas = canvas
        that.ctx = canvas.getContext('2d')
        //设置白色背景色
        that.setCanvasBg();
        that.autoSize();
    }

    changePaintRange(value) {
        let that = this;
        that.lWidth = value;
        that.listenDom.cursor.style.width = value + 'px';
        that.listenDom.cursor.style.height = value + 'px';
    }

    movingScreen(e, move) {
        let that = this,
            x = e.clientX || e.touches[0].clientX,
            y = e.clientY || e.touches[0].clientY,
            startPoint = that.startPoint,
            moveX = x - startPoint.x,
            moveY = y - startPoint.y;
        that.move = {
            x: moveX,
            y: moveY
        }
        that.ctx.restore();
    }

    longPress(e) {
        let that = this,
            x = e.clientX || e.touches[0].clientX,
            y = e.clientY || e.touches[0].clientY;
        that.isPainting = false;
        that.isMovingScreen = true;
        that.startPoint = {"x": x, "y": y};
    }

    touchStart(e) {
        let that = this,
            x = e.clientX || e.touches[0].clientX,
            y = e.clientY || e.touches[0].clientY;
        that.isPainting = !e.altKey || false;
        that.isMovingScreen = e.altKey || false;
        that.startPoint = {"x": x, "y": y};
        if (that.isPainting) {
            that.trailId = Math.random().toString(36).substr(2, 9)
        }
        if (that.isMovingScreen) {
            that.canvas.style.background = 'rgba(0,0,0,0.1)'
            that.canvas.style.border = '1px dashed #000'
        }
    }

    touchMove(e) {
        let that = this,
            x = e.clientX,
            y = e.clientY,
            startPoint = that.startPoint,
            newPoint = {"x": x, "y": y},
            trailId = that.trailId,
            drawInfo = {
                startPoint: startPoint,
                endPoint: newPoint,
                clear: that.clear,
                color: that.activeColor,
                width: that.lWidth,
                deviceWidth: window.screen.width
            };
        // that.ctx.clearRect(0, 0, that.canvas.width, that.canvas.height);
        that.websocket.send(that.groupId, {
            cmd: 'draw',
            drawInfo: drawInfo,
            trailId: trailId
        })
        that.drawLine(startPoint, newPoint, that.clear);
        that.setHistory(trailId, drawInfo)
        that.startPoint = newPoint;
    }

    touchend(e) {
        let that = this;
        if (that.isMovingScreen) {
            //获取画布数据
            let img = that.saveImg(true);
            that.canvas.width = that.canvas.width + that.move.x;
            that.canvas.height = that.canvas.height + that.move.y;
            that.drawWithImg(img);
            that.canvas.style.background = 'white';
            that.canvas.style.border = 'none'
        }
        that.isPainting = false;
        that.isMovingScreen = false;
        that.startPoint = null;
    }

    corsorMove(x, y) {
        let that = this;
        x = (x - that.lWidth / 2) + 'px';
        y = (y - that.lWidth / 2) + 'px';
        that.listenDom.cursor.style.left = x;
        that.listenDom.cursor.style.top = y;
    }

    clearCanvas() {
        const that = this;
        that.ctx.clearRect(0, 0, that.canvas.width, that.canvas.height);
        that.setCanvasBg();
    }

    drawLine(startPoint, endPoint, clear, color = '', width = this.lWidth, deviceWidth = this.deviceWidth) {
        const that = this, {move} = that;

        that.ctx.beginPath();
        let p = deviceWidth / that.canvas.width;
        startPoint = {
            x: startPoint.x / p,
            y: startPoint.y / p
        }
        endPoint = {
            x: endPoint.x / p,
            y: endPoint.y / p
        }
        that.ctx.moveTo(startPoint.x, startPoint.y);
        that.ctx.lineWidth = width;
        that.ctx.lineCap = "round";
        that.ctx.lineJoin = "round";
        if (clear) {
            that.ctx.save();
            that.ctx.globalCompositeOperation = "destination-out";
            that.ctx.lineTo(endPoint.x, endPoint.y);
            that.ctx.stroke();
            that.ctx.closePath();
            that.ctx.clip();
            that.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            that.ctx.restore();
        } else {
            that.ctx.strokeStyle = color || that.activeColor;
            that.ctx.save();
            that.ctx.lineTo(endPoint.x, endPoint.y);
            that.ctx.stroke();
            that.ctx.closePath();
            that.ctx.restore();
        }
        that.ctx.save();

    }

    autoSize() {
        const that = this;
        canvasSetSize();

        function canvasSetSize() {
            let pageWidth = document.documentElement.clientWidth;
            let pageHeight = document.documentElement.clientHeight;

            that.canvas.width = pageWidth;
            that.canvas.height = pageHeight;
            /*if (that.websocket) {
                that.websocket.send(that.groupId, {cmd: 'reload'})
            }*/
            that.drawWithImg(that.saveImg(true))
        }

        window.onresize = function () {
            canvasSetSize();
        }
    }

    setCanvasBg(color = 'white') {
        const that = this;
        that.ctx.fillStyle = color;
        that.ctx.fillRect(0, 0, that.canvas.width, that.canvas.height);
        that.ctx.fillStyle = "black";
    }

    saveImg(originalData = false) {
        let imgUrl = this.canvas.toDataURL("image/png");
        if (originalData) {
            return imgUrl
        }
        let saveA = document.createElement("a");
        document.body.appendChild(saveA);
        saveA.href = imgUrl;
        saveA.download = "zspic" + (new Date).getTime();
        saveA.target = "_blank";
        saveA.click();
    }

    drawWithImg(img) {
        const that = this;
        let image = new Image();
        image.onload = function () {
            that.ctx.drawImage(image, that.move.x, that.move.y);
        };
        image.src = img;
    }

    setHistory(key, data) {
        let that = this;
        if (!that.history.hasOwnProperty(key)) {
            that.history[key] = []
        }
        that.history[key].push(data)
    }

    undo(lastKey = null) {
        let that = this;
        lastKey = lastKey || Object.keys(that.history).pop();
        let latestHistory = that.history[lastKey];
        if (!latestHistory) return false;
        delete that.history[lastKey]
        that.websocket.send(that.groupId, {
            cmd: 'undo',
            trailId: lastKey
        })
        that.doneUndo(latestHistory)
    }

    doneUndo(latestHistory) {
        let that = this;
        latestHistory.forEach(function (item) {
            let isClear = item.clear,
                color = isClear ? that.activeColor : '#ffffff';
            that.drawLine(item.startPoint, item.endPoint, false, color, item.width + 0.5, item.deviceWidth)
        })

    }
}
