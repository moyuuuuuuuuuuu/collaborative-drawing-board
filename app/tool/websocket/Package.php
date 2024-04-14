<?php

namespace app\tool\websocket;

use GatewayWorker\Lib\Gateway;

abstract class Package
{

    public function __construct($groupId, $clientId)
    {
        $this->groupId  = $groupId;
        $this->clientId = $clientId;
    }

    public function output(array $message = [])
    {
        Gateway::sendToGroup($this->groupId, json_encode($message), [$this->clientId]);
    }
}
