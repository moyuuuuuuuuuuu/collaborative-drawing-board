<?php

namespace app\service\draw\helper;

use app\service\draw\{RedisKeyName,RoomManager};
use support\Redis;

class LineSegment
{

    /**
     * @param string $roomId
     * @param string $clientId
     * @param array{
     *     id:string,
     *     strokeId: string,
     *     x: float,
     *     y: float,
     *     color:string,
     *     size: int,
     *     isStart: bool
     * } $data
     * @return void
     */
    static function add(string $roomId, string $clientId, array $data): void
    {
        if ($data['isStart']) {
            $score = Redis::incr(sprintf(RedisKeyName::STROKE_SCORE_NAME->value, $roomId, $clientId));
            Redis::zAdd(sprintf(RedisKeyName::STROKE_LIST_NAME->value, $roomId, $clientId), $score, $data['strokeId']);
        }
        Redis::lPush(sprintf(RedisKeyName::POINT_LIST_NAME->value, $roomId, $clientId, $data['strokeId']), $data['id']);
        Redis::hmset(sprintf(RedisKeyName::POINT_HASH_NAME->value, $roomId, $clientId, $data['id']), $data);
    }

    static function undo(string $roomId, string $clientId, string $strokeId): void
    {
        Redis::zRem(sprintf(RedisKeyName::STROKE_LIST_NAME->value, $roomId, $clientId), $strokeId);
        $score = Redis::incr(sprintf(RedisKeyName::REDO_SCORE_NAME->value, $roomId, $clientId));
        Redis::zAdd(sprintf(RedisKeyName::REDO_LIST_NAME->value, $roomId, $clientId), $score, $strokeId);
    }

    static function redo(string $roomId, string $clientId, string $strokeId): void
    {
        Redis::zRem(sprintf(RedisKeyName::REDO_LIST_NAME->value, $roomId, $clientId), $strokeId);
        $score = Redis::incr(sprintf(RedisKeyName::STROKE_SCORE_NAME->value, $roomId, $clientId));
        Redis::zAdd(sprintf(RedisKeyName::STROKE_LIST_NAME->value, $roomId, $clientId), $score, $strokeId);
    }

    static function getPointsOfStroke(string $roomId, string $clientId, string $strokeId): array
    {
        $results     = [];
        $pointIdList = Redis::lRange(sprintf(RedisKeyName::POINT_LIST_NAME->value, $roomId, $clientId, $strokeId), 0, -1);
        foreach ($pointIdList as $pointId) {
            $point     = Redis::hGetAll(sprintf(RedisKeyName::POINT_HASH_NAME->value, $roomId, $clientId, $pointId));
            $results[] = [
                'id'       => $pointId,
                'point'    => [
                    'x'     => $point['x'],
                    'y'     => $point['y'],
                    'color' => $point['color'],
                    'size'  => $point['size'],
                ],
                'isStart'  => (bool)$point['isStart'],
                'strokeId' => $point['strokeId'],
            ];
        }
        return $results;
    }

    static function getPointsByRoomId(string $roomId, int $page = 1, int $size = 1000): array
    {
        $strokeIds = $results = [];
        //获取所有的StrokeId
        $allClientId = RoomManager::getMembersClientId($roomId);
        foreach ($allClientId as $clientId) {
            if (!isset($strokeIds[$clientId])) {
                $strokeIds[$clientId] = [];
            }
            $strokeIds[$clientId] = array_merge($strokeIds[$clientId], Redis::zRange(sprintf(RedisKeyName::STROKE_LIST_NAME->value, $roomId, $clientId), 0, -1));
        }
        foreach ($strokeIds as $clientId => $tmpStrokeIds) {
            foreach ($tmpStrokeIds as $strokeId) {
                $results[$clientId][$strokeId] = self::getPointsOfStroke($roomId, $clientId, $strokeId);
            }
        }
        return $results;
    }
}
