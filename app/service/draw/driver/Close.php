<?php

namespace app\service\draw\driver;

use app\service\draw\{RoomManager, Messager, helper\SnapShot};
use Webman\RedisQueue\Client;
use Workerman\Connection\TcpConnection;

class Close extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $roomId   = $connection->roomId;
        $clientId = $connection->clientId;
        RoomManager::leaveRoom($roomId, $clientId);
        if (RoomManager::getMemberCount($roomId) > 0) {
            $isManager = $connection->isManager ?? false;
            $data      = ['clientId' => $clientId, 'isManager' => $isManager, 'username' => $connection->userInfo->username];
            Messager::multicast($roomId, 'leave', sprintf('%s 已%s', $connection->userInfo->username, isset($connection->isKicked) && $connection->isKicked ? '被踢出' : '离开房间'), $data);
        }
    }
}
