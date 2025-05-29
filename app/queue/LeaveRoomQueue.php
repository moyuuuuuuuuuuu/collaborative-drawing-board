<?php

namespace app\queue;

use app\model\Room;
use app\model\RoomMember;
use app\model\User;
use Webman\RedisQueue\Consumer;

class LeaveRoomQueue implements Consumer
{

    // 要消费的队列名
    public $queue = 'LeaveRoom';

    /**
     * @param array{
     *     roomId:int,
     *     userId?:int,
     *     clientId?:int,
     *     isKicked:bool,
     *     leaveAt:string,
     * } $data
     * @return void
     */
    public function consume($data)
    {
        if (isset($data['clientId'])) {
            $data['userId'] = User::where('client_id', $data['clientId'])->value('id');
            if (!$data['userId']) {
                return;
            }
            $data['roomId'] = Room::where('unique_key', $data['roomKey'])->value('room_id');
        }
        RoomMember::update([
            'leave_at' => $data['leaveAt'],
            'status'   => isset($data['isKicked']) && $data['isKicked'] ? 3 : 2
        ], ['room_id' => $data['roomId'], 'user_id' => $data['userId']]);

    }
}
