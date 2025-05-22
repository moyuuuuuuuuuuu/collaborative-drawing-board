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

        $connection->isManager = $isManager;
        $connection->roomInfo  = $roomInfo;
        $connection->userInfo  = new UserInfo(User::where('id', $userId)->find());

        RoomManager::joinRoom($roomId, $connection);
        $membersCount = RoomManager::getMemberCount($roomId);

        $data = [
            'clientId'  => $clientId,
            'roomId'    => $roomId,
            'isManager' => $isManager,
            'isFirst'   => $membersCount <= 1,
            'members'   => []
        ];
        if ($membersCount > 1) {
            $members = RoomManager::getMembers($roomId);
            foreach ($members as $member) {
                if ($member->clientId == $clientId) {
                    continue;
                }
                $data['members'][] = [
                    'username'  => $member->userInfo->username,
                    'isManager' => $member->isManager,
                    'clientId'  => $member->clientId,
                ];
            }
            $join = ['clientId' => $clientId, 'isManager' => $isManager, 'username' => $connection->userInfo->username];
            //广播用户加入房间
            Messager::multicast($roomId, 'join', sprintf('用户[%s]加入房间', $connection->userInfo->username), ['member' => $join], [$clientId]);
        }

        Messager::unicast($connection, 'connect', $isManager ? '欢迎进入房间，您是房主，可以踢出成员' : '已经进入房间，准备开始吧！', $data);
        //获取房间所有笔迹
        $strokeList = LineSegment::getPointsByRoomId($roomId);
        Messager::unicast($connection, 'stroke', '', [
            'strokeList' => $strokeList,
            'reDraw'     => true
        ]);

    }
}
