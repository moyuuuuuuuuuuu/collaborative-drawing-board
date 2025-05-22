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
