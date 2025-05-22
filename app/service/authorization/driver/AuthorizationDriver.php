<?php

namespace app\service\authorization\driver;

use app\service\authorization\UserInfo;

abstract class AuthorizationDriver
{
    abstract public function verify(array $data): UserInfo;
}
