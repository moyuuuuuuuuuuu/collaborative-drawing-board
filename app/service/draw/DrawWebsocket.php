<?php

namespace app\service\draw;

use app\service\draw\driver\{Close, Connect, Failure};
use Workerman\Connection\TcpConnection;
use Workerman\Timer;

class DrawWebsocket
{

    public function onConnect(TcpConnection $connection)
    {
    }

    public function onWebSocketConnect(TcpConnection $connection, $http_buffer)
    {
        $headers = explode("\r\n", $http_buffer);
        $uriInfo = array_shift($headers);
        list(, $uri,) = explode(' ', $uriInfo);
        list(, $roomId, $userKey, $userId) = explode('/', $uri);
        $connection->roomId   = $roomId;
        $connection->userId   = $userId;
        $connection->clientId = $userKey;
        if (!$connection->roomId) {
            (new Failure([]))->setMessage('组ID缺失')->execute($connection);
            $connection->close();
            return;
        }
        if (!$connection->userId) {
            (new Failure([]))->setMessage('用户ID缺失')->execute($connection);
            $connection->close();
            return;
        }
        $connection->lastMessageTime = time();
        $connection->timerId         = Timer::add(10, function () use ($connection) {
            if (time() - $connection->lastMessageTime > 60) {
                Timer::del($connection->timerId);
                $connection->close();
            }
        });

        (new Connect([]))->execute($connection);
    }

    public function onMessage(TcpConnection $connection, $data)
    {
        if (!is_string($data)) {
            $connection->close();
            return;
        }

        // 如果你前端全是 arraybuffer 发送，这里就是 binary string
        list($cmd, $data, $binary) = Messager::unpack($data);
        $data['binary'] = &$binary;
        (new Dispatch())->dispatch($cmd, $data, $connection);
    }

    public function onClose(TcpConnection $connection)
    {
        (new Close())->execute($connection);
    }
}
