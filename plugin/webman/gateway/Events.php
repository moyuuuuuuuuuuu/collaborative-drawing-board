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
            'group_id'  => $data['get']['group_id']
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

    public static function onMessage($client_id, $message)
    {
        //cmd connect,draw
        $data    = json_decode($message, true);
        $groupId = $data['groupId'] ?? 0;
        if ($data['cmd'] == 'draw') {
            Gateway::sendToGroup($groupId, $message, [$client_id]);
        } else if ($data['cmd'] == 'clear') {
            Gateway::sendToGroup($groupId, $message, [$client_id]);
        } else if ($data['cmd'] == 'reload') {
            $clientIdList = Gateway::getClientIdListByGroup($groupId);
            $clientId     = array_shift($clientIdList);
            while ($clientId == $client_id || !Gateway::isOnline($clientId)) {
                $clientId = array_shift($clientIdList);
            }
            Gateway::sendToClient($clientId, json_encode([
                    'cmd'  => 'getimg',
                    'data' => [
                        'client_id' => $client_id
                    ]
                ])
            );
        } else if ($data['cmd'] = 'getimg') {
            list($img, $client_id) = array_values($data['data']);
            if (Gateway::isOnline($client_id)) {
                Gateway::sendToClient($client_id, json_encode([
                        'cmd'  => 'setimg',
                        'data' => [
                            'img' => $img
                        ]
                    ])
                );
            }
        }
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
