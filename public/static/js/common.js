async function generateCanvasId(canvas) {
    const dataUrl = canvas.toDataURL();
    const encoder = new TextEncoder();
    const data = encoder.encode(dataUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

function generateSnowId() {
    const snowflake = Math.floor(Math.random() * 10);
    return `${Date.now()}${snowflake}`;
}

async function initUser() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        const canvas = document.getElementById('board');
        if (canvas) {
            userId = generateSnowId();
        } else {
            userId = crypto.randomUUID();
        }

        // 游客身份登录
        try {
            const res = await fetch('/loginGuest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `customAuth   ${userId}`,
                },
            });
            const data = await res.json();
            if (data.code === 200) {
                localStorage.setItem('userId', userId);
                localStorage.setItem('authorizationStyle', 'customAuth');
            } else {
                layer.msg('游客登录失败');
            }
        } catch (e) {
            layer.msg('请求异常');
            console.error(e);
        }
    }
}

function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

function createMethodCallListener(targetClass, methodNames, callback) {
    // 创建一个新的构造函数，继承自目标类
    function ProxyClass(...args) {
        // 调用原始类的构造函数
        const instance = Reflect.construct(targetClass, args, ProxyClass);

        // 为实例创建代理，监听方法调用
        return new Proxy(instance, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);

                // 如果属性是函数且在监听列表中
                if (typeof value === 'function' && methodNames.includes(prop)) {
                    return function (...args) {
                        // 调用前触发回调
                        callback(prop, args);

                        // 使用 Reflect.apply 确保正确的 this 上下文
                        return Reflect.apply(value, target, args);
                    };
                }

                return value;
            }
        });
    }

    // 设置正确的原型链
    ProxyClass.prototype = Object.create(targetClass.prototype);
    ProxyClass.prototype.constructor = ProxyClass;

    // 复制静态属性
    Object.assign(ProxyClass, targetClass);

    return ProxyClass;
}
