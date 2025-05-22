<?php

namespace app\service\draw\driver;

use app\model\RoomMember;
use app\service\draw\driver\Package;
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
            RoomMember::update([
                'leave_at' => date('Y-m-d H:i:s', time()),
                'status'   => isset($connection->isKicked) && $connection->isKicked ? 3 : 2
            ], ['id' => $connection->roomInfo->id, 'user_id' => $connection->userId]);
            $connection->isKicked = true;
            $connection->close();
            RoomManager::leaveRoom($connection->roomId, $this->data['clientId']);
        }
    }
}
