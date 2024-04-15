<?php

namespace app\tool\websocket;

use support\Redis;

class Draw extends Package
{
    public function output(array $message = [], $ex = [])
    {
        $trailId = $message['trailId'] ?? 0;
        unset($message['trailId']);
        if (!$trailId) {
            return;
        }

        if (!Redis::sIsMember(sprintf('drawing:history:group:%s:client:%s', $this->groupId, $this->clientId), sprintf('drawing:history:trail:%s', $trailId))) {
            Redis::sAdd(sprintf('drawing:history:group:%s:client:%s', $this->groupId, $this->clientId), sprintf('drawing:history:trail:%s', $trailId));
        }
        Redis::lPush(sprintf('drawing:history:trail:%s', $trailId), json_encode($message['drawInfo'] ?? []));
        parent::output($message);
    }
}
