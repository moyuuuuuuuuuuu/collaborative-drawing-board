<?php

namespace app\service\draw\driver;

use app\service\draw\driver\Package;
use app\service\draw\Messager;
use app\service\draw\RoomManager;
use Workerman\Connection\TcpConnection;

/**
 * 获取客户端的blob数据并转发给其他成员
 */
class Blob extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $blob       = $this->data['binary'];
        $clientId   = $this->data['clientId'];
        $connection = RoomManager::getMember($connection->roomId, $clientId);
        if ($connection) {
            Messager::unicast($connection, 'blobToDraw', '', [], $blob);
        }
    }
}
