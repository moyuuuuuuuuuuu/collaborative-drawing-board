<?php

namespace app\service\draw\driver;

use app\service\draw\driver\Package;
use app\service\draw\Messager;
use app\service\draw\helper\LineSegment;
use support\Redis;
use Workerman\Connection\TcpConnection;

class Undo extends Package
{
    public function execute(?TcpConnection $connection)
    {

        $roomId   = $connection->roomId;
        $clientId = $connection->clientId;
        LineSegment::undo($roomId, $clientId,$this->data['strokeId']);
        Messager::multicast($roomId, 'doUndo', '', [
            'clientId' => $clientId,
            'strokeId' => $this->data['strokeId']
        ], [$clientId]);
    }
}
