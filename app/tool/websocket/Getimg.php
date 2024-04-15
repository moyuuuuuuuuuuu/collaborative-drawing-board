<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use GatewayWorker\Lib\Gateway;

class Getimg extends Package
{
    public function output(array $message = [], $ex)
    {
        list($img, $clientId) = array_values($message['data']);
        if (Gateway::isOnline($clientId)) {
            Gateway::sendToClient($clientId, json_encode([
                    'cmd'  => 'setimg',
                    'data' => [
                        'img' => $img
                    ]
                ])
            );
        }
    }
}
