<?php

namespace app\controller;

use app\traits\Jump;
use support\Request;

class LoginController extends Base
{

    use Jump;
    public function guest(Request $request)
    {
        return $this->res(200, '');
    }
}
