<?php

namespace app\service\draw\driver;

use app\enums\StrokeStatus;
use app\model\Stroke;
use app\service\draw\{helper\LineSegment, Messager, RedisKeyName};
use Webman\RedisQueue\Client;
use Workerman\Connection\TcpConnection;

class Undo extends Package
{
    public function execute(?TcpConnection $connection)
    {
        $roomId   = $connection->roomId;
        $clientId = $connection->clientId;
        LineSegment::undo($roomId, $clientId, $this->data['strokeId']);
        Messager::multicast($roomId, 'doUndo', '', [
            'clientId' => $clientId,
            'strokeId' => $this->data['strokeId']
        ], [$clientId]);

    }
}
