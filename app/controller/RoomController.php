<?php

namespace app\controller;


use app\model\Room;
use app\enums\RedisKeyName;
use app\traits\Jump;
use support\Redis;
use support\Request;

class RoomController extends Base
{

    use Jump;

    public function stream(Request $request, $roomId)
    {
        $roomInfo = Room::where('id', $roomId)->findOrEmpty();
        $snapshot = '';
        if (!$roomInfo->isEmpty()) {
            $snapshot = $roomInfo->snapshot ?? file_get_contents(images_path('empty.png'));
        }
        return response($snapshot, 200, ['Content-Type' => 'image/jpeg']);
    }

    public function joinedList(Request $request)
    {
        $userId   = $request->getUserInfo('id');
        $roomList = Room::field('id,creator_id,unique_key,create_at')->where('id', 'IN', function ($query) use ($userId) {
            $query->table('room_member')->where([
                'user_id'    => $userId,
                'is_manager' => 0
            ])->field('room_id');
        })->select()->toArray();
        if (!$roomList) {
            return $this->res(404, '', []);
        }
        foreach ($roomList as &$room) {
            $room['snapshot'] = '/s/' . $room['id'];
        }
        return $this->res(1, '', $roomList);
    }

    public function list(Request $request)
    {
        $userId   = $request->getUserInfo('id');
        $roomList = Room::field('id,creator_id,unique_key,create_at')->where('creator_id', $userId)->select()->toArray();
        if (!$roomList) {
            return $this->res(404, '', []);
        }
        foreach ($roomList as &$room) {
            $room['snapshot'] = '/s/' . $room['id'];
        }
        return $this->res(1, '', $roomList);
    }

    public function create(Request $request)
    {
        $uniqueKey = uniqid();
        $room      = Room::create([
            'unique_key' => $uniqueKey,
            'creator_id' => $request->getUserInfo('id')
        ]);

        if ($room) {
            Redis::hMSet(sprintf(RedisKeyName::INFO->value, $uniqueKey), [
                'id'         => $room->id,
                'creator_id' => $room->creator_id,
            ]);
            return $this->res(200, '创建房间成功', ['unique_key' => $uniqueKey]);
        }
        return $this->res(400, '创建房间失败');
    }

    public function index(Request $request, $s)
    {
        $host = $request->host(true);
        return view('room/room', [
            's'        => $s,
            'clientId' => $request->userInfo->uniqueKey,
            'userId'   => $request->userInfo->id,
            'userName' => $request->userInfo->username,
            'host'     => sprintf('ws://%s%s', $host, config('app.debug') ? ':8888' : '/wss')
        ]);
    }
}
