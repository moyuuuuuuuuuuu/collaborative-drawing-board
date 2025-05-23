<?php

namespace app\service\draw\driver;

use app\enums\RedisKeyName;
use app\service\draw\{helper\LineSegment, Messager};
use Workerman\Connection\TcpConnection;
use Webman\RedisQueue\Client;

/**
 * 绘画
 */
class Draw extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $roomId   = $connection->roomId;
        $clientId = $connection->clientId;
        unset($this->data['binary']);
        if (isset($this->data['id'])) {
            //存储画笔路径并组播
            LineSegment::add($roomId, $clientId, $this->data);
            //落表
            Client::send(RedisKeyName::LINESEGMENT_QUEUE_NAME->value, [
                'userId' => $connection->userInfo->id,
                'roomId' => $connection->roomInfo->id,
                ...$this->data
            ]);
            Messager::multicast($roomId, 'draw', '', $this->data, [$clientId]);
        } else if (isset($this->data['isEnd']) && $this->data['isEnd']) {
            Messager::multicast($roomId, 'stroke', '', [
                'strokeList' => [
                    $clientId => [
                        $this->data['strokeId'] => LineSegment::getPointsOfStroke($roomId, $clientId, $this->data['strokeId'])
                    ],
                ],
                'reDraw'     => false,
            ], [$clientId]);
        }
    }
}
