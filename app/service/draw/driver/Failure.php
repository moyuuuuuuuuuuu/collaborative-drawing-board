<?php

namespace app\service\draw\driver;

use app\service\draw\Messager;
use Workerman\Connection\TcpConnection;

class Failure extends Package
{
    protected $message = '模块缺失，请联系管理员';

    public function setMessage($message)
    {
        $this->message = $message;
        return $this;
    }

    public function execute(?TcpConnection $connection)
    {
        Messager::unicast($connection, 'failure', $this->message, []);
    }
}
