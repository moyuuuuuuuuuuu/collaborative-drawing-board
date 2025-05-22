<?php

namespace app\service\draw;

use Webman\RedisQueue\Client;

/**
 * 房间管理器
 */
class RoomManager
{
    static private $connectionList = [];

    static public function joinRoom(string $roomId, $connection): void
    {
        self::$connectionList[$roomId][$connection->clientId] = $connection;
        Client::send(RedisKeyName::JOIN_ROOM_QUEUE_NAME->value, [
            'roomId'    => $connection->roomInfo->id,
            'userId'    => $connection->userId,
            'isManager' => $connection->isManager,
            'joinAt'    => date("Y-m-d H:i:s"),
        ]);
    }

    static public function getMember($roomId, $clientId)
    {
        return self::$connectionList[$roomId][$clientId] ?? null;
    }

    static public function leaveRoom($roomId, $clientId)
    {
        $connection = self::$connectionList[$roomId][$clientId] ?? null;
        if ($connection) {
            Client::send(RedisKeyName::LEAVE_ROOM_QUEUE_NAME->value, [
                'roomId'   => $connection->roomInfo->id,
                'userId'   => $connection->userId,
                'leaveAt'  => date("Y-m-d H:i:s"),
                'isKicked' => $connection->isKicked ?? false,
            ]);
        } else {
            Client::send(RedisKeyName::LEAVE_ROOM_QUEUE_NAME, [
                'roomKey'  => $roomId,
                'clientId' => $clientId,
                'leaveAt'  => date("Y-m-d H:i:s"),
                'isKicked' => false,
            ]);
        }
        unset(self::$connectionList[$roomId][$clientId]);

    }

    static public function getMembers($roomId)
    {
        return self::$connectionList[$roomId] ?? [];
    }

    static function getMembersClientId($roomId)
    {
        return array_keys(self::$connectionList[$roomId] ?? []);
    }

    static public function closeAllConnectionsOfRoom($roomId)
    {
        foreach (self::$connectionList[$roomId] as $connection) {
            $connection->close();
        }
        self::$connectionList = [];
    }

    static public function getAllMembers()
    {
        return self::$connectionList;
    }

    static public function getMemberCount($roomId)
    {
        if (!isset(self::$connectionList[$roomId])) {
            return 0;
        }
        return count(self::$connectionList[$roomId]);
    }
}
