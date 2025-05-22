<?php

namespace app\service\authorization\driver;

use app\model\User;
use app\service\authorization\{AuthorizationException,UserInfo};
use Firebase\JWT\{JWT, Key};

class Bearer extends AuthorizationDriver
{

    /**
     * @param array $data
     * @return UserInfo
     * @throws \Exception
     */
    public function verify(array $data): UserInfo
    {
        $jwtToken = array_pop($data);
        $headers  = new \stdClass();
        try {

            $data = JWT::decode($jwtToken, new Key(getenv('JWT_KEY'), 'HS256'), $headers);
        } catch (\Firebase\JWT\ExpiredException $e) {
            throw new AuthorizationException('Token expired', 401);
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            throw new AuthorizationException('Invalid token signature', 401);
        } catch (\Firebase\JWT\BeforeValidException $e) {
            throw new AuthorizationException('Token absent', 401);
        } catch (\Exception $e) {
            throw new AuthorizationException($e->getMessage(), 401);
        }
        $userInfo = User::where('id', $data->pk)->findOrEmpty();
        if ($userInfo->isEmpty()) {
            throw new \Exception('User not found', 401);
        }
        return new UserInfo($userInfo);
    }
}
