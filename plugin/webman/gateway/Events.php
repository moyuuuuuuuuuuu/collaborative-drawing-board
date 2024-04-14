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
        Gateway::setSession($client_id, [
            'client_id' => $data['get']['client_id'],
            'group_id'  => $data['get']['group_id'],
            'is_owner'  => $data['get']['is_owner'] ?? false,
        ]);
        Gateway::sendToClient($client_id, json_encode([
                'cmd'     => 'join',
                'message' => '连接成功',
                'data'    => [
                    'num'             => Gateway::getClientCountByGroup($data['get']['group_id']),
                    'showReloadLayer' => Gateway::getClientCountByGroup($data['get']['group_id']) > 1
                ]
            ])
        );
        Gateway::sendToGroup($data['get']['group_id'], json_encode([
            'cmd'     => 'join',
            'data'    => [
                'group_id' => $data['get']['group_id'],
                'num'      => Gateway::getClientCountByGroup($data['get']['group_id'])
            ],
            'message' => '有新用户加入'
        ]), [$client_id]);
    }

    public static function onMessage($clientId, $message)
    {
        $data    = json_decode($message, true);
        $groupId = $data['groupId'] ?? 0;
        /**
         * @var $class \app\tool\websocket\Package
         */
        $class = 'app\\tool\\websocket\\' . ucfirst($data['cmd']);
        if (class_exists($class)) {
            $class = new $class($groupId, $clientId);
        } else {
            Gateway::sendToClient($clientId, json_encode(['code' => 1002, 'msg' => '未知命令', 'cmd' => 'close']));
            return;
        }
        $class->output($data);
    }

    public static function onClose($client_id)
    {
        $groupId = Gateway::getSession($client_id)['group_id'] ?? 0;
        Gateway::leaveGroup($client_id, $groupId);
        if ($groupId) {
            Gateway::sendToGroup($groupId, json_encode([
                'cmd'     => 'leave',
                'message' => '有用户离开',
                'data'    => [
                    'num' => Gateway::getClientCountByGroup($groupId)
                ]
            ]), [$client_id]);
        }

    }

}
