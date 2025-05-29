<?php

namespace app\queue;

use app\model\RoomMember;
use Webman\RedisQueue\Consumer;

class JoinRoomQueue implements Consumer
{

    // 要消费的队列名
    public $queue = 'JoinRoom';

    public function consume($data)
    {
        $joinLog = RoomMember::where(['room_id' => $data['roomId'], 'user_id' => $data['userId']])->findOrEmpty();
        if ($joinLog->isEmpty()) {
            RoomMember::create([
                'room_id'    => $data['roomId'],
                'user_id'    => $data['userId'],
                'is_manager' => (int)$data['isManager'],
            ]);
        } else {
            $joinLog->join_at = $data['joinAt'];
            $joinLog->status  = 1;
            $joinLog->save();
        }
    }
}
