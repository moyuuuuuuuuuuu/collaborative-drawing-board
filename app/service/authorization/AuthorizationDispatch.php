<?php

namespace app\service\authorization;


class AuthorizationDispatch
{
    private $namespace = __NAMESPACE__;

    public function dispatch($cmd, $data): UserInfo
    {
        $class = sprintf('%s\driver\%s', $this->namespace, ucfirst($cmd));
        if (class_exists($class)) {
            $command = new $class();
        } else {
            throw new AuthorizationException(sprintf("Class %s does not exist", $class));
        }
        return $command->verify($data);
    }
}
