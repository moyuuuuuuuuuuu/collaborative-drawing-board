<?php

namespace process;

use app\tool\websocket\Connected;
use Workerman\Connection\TcpConnection;
use Workerman\Timer;

class Websocket
{
    /**
     * 连接后如果有roomid则以roomid为键名存入redis bitmap中 fd为位 1代表进入此组 0代表未进入此组
     */
    public function onWorkStart()
    {
        Timer::add(10, function () {
            $time_now = time();
            foreach ($this->connections as $connection) {
                // 有可能该connection还没收到过消息，则lastMessageTime设置为当前时间
                if (empty($connection->lastMessageTime)) {
                    $connection->lastMessageTime = $time_now;
                    continue;
                }
                // 上次通讯时间间隔大于心跳间隔，则认为客户端已经下线，关闭连接
                if ($time_now - $connection->lastMessageTime > HEARTBEAT_TIME) {
                    $connection->close();
                }
            }
        });
    }

    public function onWebSocketConnect(TcpConnection $connection, $http_buffer)
    {
        $uriInfoList = explode(' ', $http_buffer);
        $uri         = $uriInfoList[1];
        $uriList     = parse_url($uri);
        parse_str($uriList['query'], $param);
        list($groupId, $clientId) = array_values($param);
        $connection->groupId  = $groupId;
        $connection->clientId = $clientId;
        $connection->send((new Connected())->output('connected', 1, '连接成功', ['groupId' => $groupId, 'clientId' => $clientId]));
    }

    public function onMessage(TcpConnection $connection, $data)
    {
        $httpData = json_decode($data, true);
        $groupId  = $httpData['groupId'] ?? 0;
        $cmd      = $httpData['cmd'] ?? 'connect';
        if ($groupId <= 0) {
            $connection->send(json_encode(['code' => 1001, 'msg' => '缺少房间id，刷新重试', 'cmd' => 'close']));
            return;
        }
        var_dump($this->connectionis);
        $key   = 'room:' . $groupId;
        $class = 'app\\tool\\websocket\\' . ucfirst($cmd);
        if (class_exists($class)) {
            $class = new $class($groupId, $connection);
        } else {
            $connection->send(json_encode(['code' => 1002, 'msg' => '未知命令', 'cmd' => 'close']));
            return;
        }
        echo "onWebSocketConnect\n";
    }

    public function onClose(TcpConnection $connection)
    {
        echo "onClose\n";
    }
}
