class Drawing {
    canvas = null
    ctx = null
    activeColor = 'black'
    lWidth = 4
    groupId = 0
    clear = false
    listenDom = {
        eraser: document.getElementById('eraser'),
        brush: document.getElementById('brush'),
        clear: document.getElementById('clear'),
        aColorBtn: document.getElementsByClassName('color-item'),
        save: document.getElementById('save'),
        // undo: document.getElementById('undo'),
        range: document.getElementById('range'),
        share: document.getElementById('share'),
    }
    historyData = []

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
                if (that.historyData.length < 1) return false;
                that.ctx.putImageData(that.historyData[that.historyData.length - 1], 0, 0);
                that.historyData.pop()
            });
        }
        //线条粗细监听
        if (that.listenDom.hasOwnProperty('range')) {
            that.listenDom.range.addEventListener('change', function () {
                that.lWidth = this.value;
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
    }

    clearCanvas() {
        const that = this;
        that.ctx.clearRect(0, 0, that.canvas.width, that.canvas.height);
        that.setCanvasBg();
    }

    initCanvas(canvas) {
        const that = this;
        that.canvas = canvas
        that.ctx = canvas.getContext('2d')
        //设置白色背景色
        that.setCanvasBg();
        that.autoSize();
        //划线监听
        that.listenUserDraw();
    }

    listenUserDraw() {
        const that = this;
        //移动端监听
        if (/Android/i.test(navigator.userAgent) || /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            that.canvas.addEventListener('mousedown', function () {
                layer.msg('12123123')
                let isPointing = false, startPoint;
                that.canvas.ontouchstart = (e) => {
                    isPointing = true;
                    startPoint = {x: e.clientX, y: e.clientY}
                };
                that.canvas.ontouchmove = (e) => {
                    if (isPointing) {
                        let endPoint = {x: e.clientX, y: e.clientY}
                        that.drawLine(startPoint, endPoint, that.clear)
                        that.websocket.send(that.groupId, {
                            cmd: 'draw',
                            drawInfo: {
                                startPoint: startPoint,
                                endPoint: endPoint,
                                clear: that.clear,
                                color: that.activeColor,
                                width: that.lWidth
                            }
                        })
                        startPoint = endPoint
                    }
                }

                that.canvas.ontouchend = () => {
                    isPointing = false;
                }
            });
        } else {
            that.canvas.addEventListener('mousedown', function () {
                let isPointing = false;
                that.canvas.onmousedown = (e) => {
                    isPointing = true;
                    let startPoint = {x: e.clientX, y: e.clientY}
                    that.canvas.onmousemove = (e) => {
                        if (isPointing) {
                            let endPoint = {x: e.clientX, y: e.clientY}
                            that.drawLine(startPoint, endPoint, that.clear)
                            that.websocket.send(that.groupId, {
                                cmd: 'draw',
                                drawInfo: {
                                    startPoint: startPoint,
                                    endPoint: endPoint,
                                    clear: that.clear,
                                    color: that.activeColor,
                                    width: that.lWidth
                                }
                            })
                            startPoint = endPoint
                        }
                    }
                    that.canvas.onmouseup = () => {
                        isPointing = false;
                    }
                }

                /*let data = that.ctx.getImageData(0, 0, that.canvas.width, that.canvas.height);
                that.historyData.push(data);*/
            });
        }

    }

    drawLine(startPoint, endPoint, clear, color = '', width = this.lWidth) {
        const that = this;
        that.ctx.beginPath();
        that.ctx.moveTo(startPoint.x, startPoint.y);
        that.ctx.lineWidth = width;
        that.ctx.lineCap = "round";
        that.ctx.lineJoin = "round";
        if (clear) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = "destination-out";
            this.ctx.lineTo(endPoint.x, endPoint.y);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.clip();
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        } else {
            that.ctx.strokeStyle = color || that.activeColor;
            that.ctx.fillStyle = color || that.activeColor;
            this.ctx.save();
            this.ctx.lineTo(endPoint.x, endPoint.y);
            this.ctx.stroke();
            this.ctx.closePath();
            this.ctx.restore();
        }
    }

    autoSize() {
        const that = this;
        canvasSetSize();

        function canvasSetSize() {
            let pageWidth = document.documentElement.clientWidth;
            let pageHeight = document.documentElement.clientHeight;

            that.canvas.width = pageWidth;
            that.canvas.height = pageHeight;
            if (that.websocket) {
                that.websocket.send(that.groupId, {cmd: 'reload'})
            }
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
        var image = new Image();
        image.onload = function () {
            that.ctx.drawImage(image, 0, 0);
        };
        image.src = img;
    }
}
