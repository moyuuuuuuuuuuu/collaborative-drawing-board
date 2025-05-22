<?php

namespace app\service\draw;

use support\Redis;

/**
 * 房间管理器
 */
class RoomManager
{
    static private $connectionList = [];

    static public function joinRoom(string $roomId, $connection): void
    {
        self::$connectionList[$roomId][$connection->clientId] = $connection;
    }

    static public function getMember($roomId, $clientId)
    {
        return self::$connectionList[$roomId][$clientId] ?? null;
    }

    static public function leaveRoom($roomId, $clientId)
    {
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
