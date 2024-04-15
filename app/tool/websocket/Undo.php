<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use support\Redis;

class Undo extends Package
{
    public function output(array $message = [], $ex = [])
    {
        $trailId = $message['trailId'] ?? 0;
        if (!$trailId) {
            return;
        }
        //获取当前轨迹信息
        $drawInfo = Redis::lRange(sprintf('drawing:history:trail:%s', $trailId), 0, -1);
        foreach ($drawInfo as $key => $value) {
            $drawInfo[$key] = json_decode($value, true);
        }
        parent::output([
            'cmd'  => 'undo',
            'data' => [
                'drawInfo' => $drawInfo
            ]
        ], [$this->clientId]);

        //删除当前轨迹
        Redis::sRem(sprintf('drawing:history:group:%s:client:%s', $this->groupId, $this->clientId), sprintf('drawing:history:trail:%s', $trailId));
        //删除当前轨迹信息
        Redis::del(sprintf('drawing:history:trail:%s', $trailId));

    }
}
