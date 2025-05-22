<?php

namespace app\service\draw\driver;

use app\service\authorization\UserInfo;
use app\model\{Room, RoomMember, User};
use app\service\draw\{helper\LineSegment, RoomManager, Messager};
use Workerman\Connection\TcpConnection;
use Workerman\Protocols\Websocket;

/**
 * 进入房间
 */
class Connect extends Package
{

    public function execute(?TcpConnection $connection)
    {
        $roomId                    = $connection->roomId;
        $userId                    = $connection->userId;
        $clientId                  = $connection->clientId;
        $connection->websocketType = Websocket::BINARY_TYPE_ARRAYBUFFER;
        $roomInfo                  = Room::where('unique_key', $roomId)->findOrEmpty();
        if ($roomInfo->isEmpty()) {
            (new Failure([]))->setMessage('Room not found')->execute($connection);
            return;
        }
        $isManager = intval($roomInfo->creator_id) == intval($userId);
        $message   = '已经进入房间，准备开始吧！';
        if ($isManager) {
            $message = '欢迎进入房间，您是房主，可以踢出成员';
        }
        $connection->isManager = $isManager;
        $connection->roomInfo  = $roomInfo;
        $connection->userInfo  = new UserInfo(User::where('id', $userId)->find());
        $joinLog               = RoomMember::where(['room_id' => $roomInfo->id, 'user_id' => $userId])->findOrEmpty();
        if ($joinLog->isEmpty()) {
            RoomMember::create([
                'room_id'    => $roomInfo->id,
                'user_id'    => $userId,
                'is_manager' => (int)$isManager,
            ]);
        } else {
            $joinLog->join_at = date('Y-m-d H:i:s');
        }
        RoomManager::joinRoom($roomId, $connection);


        //获取房间所有笔迹
        $strokeList = LineSegment::getPointsByRoomId($roomId);
        Messager::multicast($roomId, 'stroke', '', [
            'strokeList' => $strokeList,
            'reDraw'     => true
        ]);

        $data    = [
            'clientId'  => $clientId,
            'roomId'    => $roomId,
            'isManager' => $isManager,
            'isFirst'   => true,
        ];
        $members = RoomManager::getMembers($roomId);
        foreach ($members as $member) {
            $data['members'][] = [
                'username'  => $member->userInfo->username,
                'isManager' => $member->isManager,
                'clientId'  => $member->clientId,
            ];
        }
        $data['isFirst'] = RoomManager::getMemberCount($roomId) <= 1;
        Messager::unicast($connection, 'connect', $message, $data);
        unset($data);
        $data['member'] = ['clientId' => $clientId, 'isManager' => $isManager, 'username' => $connection->userInfo->username];
        //随机获取一个用户导出canvas数据并重绘给当前用户
        if (RoomManager::getMemberCount($roomId) > 1) {
            Messager::multicast($roomId, 'join', sprintf('用户[%s]加入房间', $connection->userInfo->username), $data, [$clientId]);
        }

        //获取房间所有笔迹
        $strokeList = LineSegment::getPointsByRoomId($roomId);
        Messager::multicast($roomId, 'stroke', '', [
            'strokeList' => $strokeList,
            'reDraw'     => true
        ], ['clientId' => $clientId]);

    }
}
