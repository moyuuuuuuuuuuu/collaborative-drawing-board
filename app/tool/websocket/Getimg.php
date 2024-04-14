<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use GatewayWorker\Lib\Gateway;

class Getimg extends Package
{
    public function output(array $message = [])
    {
        list($img, $client_id) = array_values($message['data']);
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
