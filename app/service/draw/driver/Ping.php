<?php

namespace app\service\draw\driver;

use app\service\draw\Messager;
use Workerman\Connection\TcpConnection;

class Ping extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $connection->lastMessageTime = time();
        Messager::unicast($connection, 'pong', 'ping', [
            'lastMessageTime' => $connection->lastMessageTime,
            'clientId'        => $connection->clientId
        ]);
    }
}
