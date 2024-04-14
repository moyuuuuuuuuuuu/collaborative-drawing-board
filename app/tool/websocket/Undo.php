<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use support\Redis;

class Undo extends Package
{
    public function output(array $message = [])
    {
        $trailId = $message['trailId'] ?? 0;
        //撤销绘画历史
        if (!$trailId) {
            return;
        }
        $drawInfo = Redis::lRange('trail:' . $trailId, 0, -1);
        foreach ($drawInfo as $key => $value) {
            $drawInfo[$key] = json_decode($value, true);
        }
        parent::output([
            'cmd'  => 'undo',
            'data' => [
                'drawInfo' => $drawInfo
            ]
        ]);
    }
}
