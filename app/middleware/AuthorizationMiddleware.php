<?php

namespace app\middleware;

use app\model\User;
use app\traits\Jump;
use app\service\authorization\{AuthorizationException, AuthorizationDispatch, UserInfo};
use Webman\Http\Request;
use Webman\Http\Response;
use Webman\MiddlewareInterface;

class AuthorizationMiddleware implements MiddlewareInterface
{
    use Jump;

    public function process(Request $request, callable $next): Response
    {

        $isLogin = $request->session()->get('isLogin');
        // 已经登录，直接返回
        if ($isLogin) {
            $request->setUserInfo(new UserInfo(User::where('id', $isLogin)->find()));
            return $next($request);
        }
        // 通过反射获取控制器哪些方法不需要登录
        $controller  = new \ReflectionClass($request->controller);
        $noNeedLogin = $controller->getDefaultProperties()['noNeedLogin'] ?? [];
        if (in_array($request->action, $noNeedLogin)) {
            return $next($request);
        }
        $userTokens = $request->header('Authorization');
        // 访问的方法需要登录
        if ($userTokens && !in_array($request->action, $noNeedLogin)) {
            list($authorizationStyle, $userToken) = explode('  ', $userTokens);
            try {
                $userInfo = (new AuthorizationDispatch)->dispatch($authorizationStyle, [$userToken]);
            } catch (AuthorizationException $e) {
                if ($request->isAjax()) {
                    return $this->res(403, $e->getMessage());
                }
                return response($e->getMessage());
            }
        } else if (!$userTokens && !in_array($request->action, $noNeedLogin)) {
            $userInfo = new UserInfo(User::createOne(uniqid()));
        }

        $request->setUserInfo($userInfo);
        $request->session()->set('isLogin', $userInfo->id);
        return $next($request);
    }
}
