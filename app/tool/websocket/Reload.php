<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;
use GatewayWorker\Lib\Gateway;

class Reload extends Package
{
    public function output(array $message = [], $ex = [])
    {
        $clientIdList = Gateway::getClientIdListByGroup($this->groupId);
        $clientId     = array_shift($clientIdList);
        while (!$clientId || $clientId == $this->clientId || !Gateway::isOnline($clientId)) {
            $clientId = array_shift($clientIdList);
        }
        parent::output([
            'cmd'  => 'getimg',
            'data' => [
                'client_id' => $this->clientId
            ]
        ], $ex);
    }
}
