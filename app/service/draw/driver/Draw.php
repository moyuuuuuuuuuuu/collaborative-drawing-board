<?php

namespace app\service\draw\driver;

use app\service\draw\{helper\LineSegment, RedisKeyName, Messager};
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
        if (isset($this->data['id'])) {
            $data = [
                'id'       => $this->data['id'],
                'strokeId' => $this->data['strokeId'],
                ...$this->data['point']
            ];
            //存储画笔路径并组播
            LineSegment::add($roomId, $clientId, $data);
            //落表
            Client::send(RedisKeyName::LINESEGMENT_QUEUE_NAME->value, [
                'userId' => $connection->userInfo->id,
                'roomId' => $connection->roomInfo->id,
                ...$data
            ]);
            Messager::multicast($roomId, 'draw', '', $this->data, [$clientId]);
        }

        if (isset($this->data['isEnd']) && $this->data['isEnd']) {
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
