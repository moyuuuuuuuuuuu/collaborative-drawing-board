<?php

namespace app\queue;

use app\model\Room;
use support\Redis;
use Webman\RedisQueue\Consumer;

class SnapShotQueue implements Consumer
{

    public $queue = 'snapshot';

    /**
     * @param array{roomId:string} $data
     * @return void
     */
    public function consume($data)
    {
        $blob = Redis::get(sprintf('room:%s:snapshot', $data['roomId']));
        Room::update(['blob' => $blob], ['unique_key' => $data['roomId']]);
    }
}
