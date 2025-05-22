<?php

namespace app\queue;

use app\model\Stroke;
use Webman\RedisQueue\Consumer;

class LineSegmentQueue implements Consumer
{
    // 要消费的队列名
    public $queue = 'LineSegment';

    // 连接名，对应 plugin/webman/redis-queue/redis.php 里的连接`
    public $connection = 'default';

    /**
     * @param array{
     *     userId:int,
     *     roomId:int,
     *     id:int,
     *     x:int,
     *     y:int,
     *     color:string,
     *     size:int
     * } $data
     * @return void
     */
    public function consume($data)
    {
        Stroke::create([
            'user_id'   => $data['userId'],
            'room_id'   => $data['roomId'],
            'x'         => $data['x'],
            'y'         => $data['y'],
            'color'     => $data['color'],
            'size'      => $data['size'],
            'id'        => $data['id'],
            'stroke_id' => $data['strokeId'],
        ]);
    }
}
