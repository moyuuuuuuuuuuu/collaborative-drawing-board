<?php

namespace app\service\draw\driver;

use app\service\draw\Messager;
use Workerman\Connection\TcpConnection;

class Pong extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $connection->lastMessageTime = time();
        Messager::unicast($connection, 'ping', 'ping', [
            'lastMessageTime' => $connection->lastMessageTime,
            'clientId'        => $connection->clientId
        ]);
    }
}
