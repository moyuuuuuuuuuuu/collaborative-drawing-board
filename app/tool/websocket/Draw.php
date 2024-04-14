<?php

namespace app\tool\websocket;

use support\Redis;

class Draw extends Package
{
    public function output(array $message = [])
    {
        $trailId = $message['trailId'] ?? 0;
        unset($message['trailId']);
        //记录绘画历史
        if (!$trailId) {
            return;
        }
        Redis::lPush('trail:' . $trailId, json_encode($message['drawInfo'] ?? []));
        parent::output($message);

    }
}
