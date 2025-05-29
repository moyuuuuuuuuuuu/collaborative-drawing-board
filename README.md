### 协作画板

基于webman框架的协作画板，支持多人协作，支持画笔、橡皮擦、颜色选择、分享链接、undo/redo等功能。

#### 功能
- 多人协作
- 画笔、橡皮擦
- 颜色选择、画笔粗细
- udo/redo
- 分享链接
- 房间管理
- 踢出房间用户

### 配置
```
cp.env.example .env
```

### 运行
```shell
#linux
php start.php start （-d 守护进程模式）
#win
php windows.php
```

#### nginx配置
```nginx configuration
server{
    listen 80;
    server_name test.example.com
     # 普通 HTTP 请求代理到 8080 端口
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 调整代理缓冲区大小（根据需要）
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理配置
    location /wss/ {
        proxy_pass http://127.0.0.1:8888/;  # 注意末尾的斜杠，确保路径正确传递

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 长连接超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        
        # 禁用缓冲区，避免 WebSocket 消息延迟
        proxy_buffering off;
        
        # 添加额外的 WebSocket 相关头（可选）
        proxy_set_header X-Forwarded-Host $host:$server_port;
        proxy_set_header X-Forwarded-Server $host;
    }
}
```

### FEAUTURES
- 思维导图
- 流程图
- 拖拽图形、画布
- 聊天室
- 语音通话



