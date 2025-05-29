<?php

namespace app\controller;

use support\Request;

class IndexController extends Base
{
    protected $noNeedLogin = ['index'];

    public function index(Request $request)
    {
        return view('index/index');
    }

}
