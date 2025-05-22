<?php

namespace app\service\draw\driver;

use app\model\Room;
use app\service\draw\driver\Package;
use support\Redis;
use Workerman\Connection\TcpConnection;

class Snap extends Package
{

    public function execute(?TcpConnection $connection)
    {
        Redis::set(sprintf('room:%s:snapshot', $connection->roomId), $this->data['binary']);
        Room::update([
            'snapshot' => $this->data['binary']
        ], ['id' => $connection->roomInfo->id]);
    }
}
