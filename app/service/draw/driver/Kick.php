<?php

namespace app\service\draw\driver;

use app\model\RoomMember;
use app\service\draw\RoomManager;
use Workerman\Connection\TcpConnection;

/**
 * 踢出房间
 */
class Kick extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $connection = RoomManager::getMember($connection->roomId, $this->data['clientId']);
        if ($connection) {
            $connection->isKicked = true;
            $connection->close();
        }
    }
}
