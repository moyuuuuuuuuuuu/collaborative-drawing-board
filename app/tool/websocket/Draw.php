<?php

namespace app\tool\websocket;

use app\tool\websocket\Package;

class Draw extends Package
{
    public $cmd = 'draw';

    public $data = [
        'type' => '',
        'data' => []
    ];

    public function __construct($type, $data)
    {
        $this->data['type'] = $type;
        $this->data['data'] = $data;
    }
}
