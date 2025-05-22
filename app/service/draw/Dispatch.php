<?php

namespace app\service\draw;

use app\service\draw\driver\Failure;

class Dispatch
{
    private $namespace = 'app\service\draw';

    public function dispatch($cmd, $data, $connection)
    {
        $connection->lastMessageTime = time();
        $class                       = sprintf('%s\driver\%s', $this->namespace, ucfirst($cmd));
        if (class_exists($class)) {
            $command = new $class($data);
        } else {
            $command = new Failure([]);
        }
        $command->execute($connection);
    }
}
