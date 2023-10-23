<?php

namespace plugin\webman\gateway;

use GatewayWorker\Lib\Gateway;
use Illuminate\Support\Facades\Gate;
use support\Redis;

class Events
{
    public static function onWorkerStart($worker)
    {

    }

    public static function onConnect($client_id)
    {

    }

    public static function onWebSocketConnect($client_id, $data)
    {
        if (!isset($data['get']['client_id']) || !isset($data['get']['group_id'])) {
            Gateway::closeClient($client_id);
            return;
        }
        Gateway::bindUid($client_id, $data['get']['client_id']);
        Gateway::joinGroup($client_id, $data['get']['group_id']);
    }

    public static function onMessage($client_id, $message)
    {
        //cmd connect,draw
        $data    = json_decode($message, true);
        $groupId = $data['groupId'] ?? 0;
        Gateway::sendToGroup($message['group_id'], $message['data']);
    }

    public static function onClose($client_id)
    {

    }

}
