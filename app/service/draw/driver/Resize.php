<?php

namespace app\service\draw\driver;

use app\service\draw\driver\Package;
use app\service\draw\Messager;
use app\service\draw\RoomManager;
use Workerman\Connection\TcpConnection;

/**
 * 重绘canvas
 */
class Resize extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $members = RoomManager::getMembers($connection->roomId);
        do {
            $memberIdx = array_rand($members);
        } while ($memberIdx == $connection->clientId);
        Messager::unicast($members[$memberIdx], 'blob', '', ['clientId' => $connection->clientId]);
    }
}
