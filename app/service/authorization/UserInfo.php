<?php

namespace app\service\authorization;

use app\model\User;

class UserInfo
{
    public $id;
    public $username;
    public $avatar;

    public $email;
    public $password;
    public $status;

    public $isGuest;

    public $createAt;

    public $updateAt;

    public $lastLoginIp;

    public $lastLoginTime;

    public $uniqueKey;

    public function __construct(User $userInfo)
    {
        $this->id            = $userInfo->id;
        $this->username      = $userInfo->username;
        $this->avatar        = $userInfo->avatar;
        $this->email         = $userInfo->email;
        $this->password      = $userInfo->password;
        $this->status        = $userInfo->status;
        $this->isGuest       = $userInfo->isGuest;
        $this->createAt      = $userInfo->create_at;
        $this->updateAt      = $userInfo->update_at;
        $this->lastLoginIp   = $userInfo->last_login_ip;
        $this->lastLoginTime = $userInfo->last_login_time;
        $this->uniqueKey     = trim($userInfo->unique_key);
    }

}
