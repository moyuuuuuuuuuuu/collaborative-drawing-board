<?php

namespace app\model;

use support\think\Model;

class User extends Model
{
    protected $table              = 'user';
    protected $autoWriteTimestamp = true;
    protected $createTime         = 'create_at';
    protected $updateTime         = 'update_at';

    static function createOne($userToken)
    {
        return User::create([
            'username'   => generateUserName(),
            'password'   => generatePassword(),
            'unique_key' => $userToken,
            'is_guest'   => 1,
            'email'      => '',
        ]);
    }
}
