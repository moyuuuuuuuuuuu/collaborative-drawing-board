<?php

namespace app\service\authorization\driver;

use app\model\User;
use app\service\authorization\AuthorizationException;
use app\service\authorization\UserInfo;

class CustomAuth extends AuthorizationDriver
{

    /**
     * @param array $data
     * @return UserInfo
     */
    public function verify(array $data): UserInfo
    {
        $userToken = array_pop($data);
        $userInfo  = User::where('unique_key', $userToken)->findOrEmpty();
        if ($userInfo->isEmpty()) {
            $userInfo = User::createOne($userToken);
        }
        if (!$userInfo) {
            throw new AuthorizationException('用户信息未找到', 405);
        }
        return new UserInfo($userInfo);
    }
}
