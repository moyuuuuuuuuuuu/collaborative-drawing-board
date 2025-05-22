<?php

namespace app\service\draw\driver;

use app\service\draw\Messager;
use Workerman\Connection\TcpConnection;

/**
 * 鼠标指针
 */
class Cursor extends Package
{

    public function execute(?TcpConnection $connection)
    {
        Messager::multicast($connection->roomId, 'cursor', '', $this->data, [$connection->clientId]);
    }
}
