<?php

namespace app\service\draw\driver;

use Workerman\Connection\TcpConnection;

abstract class Package
{


    protected $message;

    protected $data;

    public function __construct(array $data = [])
    {
        $this->data = $data ?? [];
    }

    abstract public function execute(?TcpConnection $connection);

}
