<?php

namespace app\controller;

use support\Request;

class IndexController
{
    public function index(Request $request)
    {
        $roomId  = $request->get('r', 0);
        $isOwner = false;
        if (!$roomId) {
            $roomId  = uuid();
            $isOwner = true;
        }

        return view('index/index', ['roomId' => $roomId, 'isOwner' => $isOwner]);
    }

    public function view(Request $request)
    {
        return view('index/view', ['name' => 'webman']);
    }

}
