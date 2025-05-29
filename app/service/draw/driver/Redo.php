<?php

namespace app\service\draw\driver;

use app\enums\StrokeStatus;
use app\model\Stroke;
use app\service\draw\{Messager, helper\LineSegment};
use Workerman\Connection\TcpConnection;

class Redo extends Package
{
    public function execute(?TcpConnection $connection)
    {

        $roomId   = $connection->roomId;
        $clientId = $connection->clientId;
        LineSegment::redo($roomId, $clientId, $this->data['strokeId']);
        Stroke::update([
            'status' => StrokeStatus::NORMAL->value,
        ], ['stroke_id' => $this->data['strokeId']]);
        Messager::multicast($roomId, 'doRedo', '', [
            'clientId' => $clientId,
            'strokeId' => $this->data['strokeId']
        ], [$clientId]);
    }
}
