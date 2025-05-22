<?php

namespace app\service\draw\driver;

use app\model\RoomMember;
use app\service\draw\helper\SnapShot;
use app\service\draw\Messager;
use app\service\draw\RoomManager;
use Webman\RedisQueue\Client;
use Workerman\Connection\TcpConnection;

class Close extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $roomId    = $connection->roomId;
        $clientId  = $connection->clientId;
        $isManager = $connection->isManager ?? false;
        RoomMember::update([
            'leave_at' => date('Y-m-d H:i:s', time()),
            'status'   => isset($connection->isKicked) && $connection->isKicked ? 3 : 2
        ], ['id' => $connection->roomInfo->id, 'user_id' => $connection->userId]);
        RoomManager::leaveRoom($roomId, $clientId);
        $data = ['clientId' => $clientId, 'isManager' => $isManager, 'username' => $connection->userInfo->username];
        Messager::multicast($roomId, 'leave', sprintf('%s 已%s', $connection->userInfo->username, isset($connection->isKicked) && $connection->isKicked ? '被踢出' : '离开房间'), $data);
        if (RoomManager::getMemberCount($roomId) <= 0) {
            Client::send(SnapShot::NAME, ['roomId' => $roomId]);
        }
    }
}
