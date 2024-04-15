<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use GatewayWorker\Lib\Gateway;

class Ping extends Package
{
    public function output(array $message = [], $ex = [])
    {
        Gateway::sendToClient($this->clientId, '{"type":"pong"}');
    }
}
