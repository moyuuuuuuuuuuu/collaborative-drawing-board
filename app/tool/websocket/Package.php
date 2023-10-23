<?php

namespace app\tool\websocket;

abstract class Package
{
    public $code = 0;

    public $cmd     = '';
    public $data    = null;
    public $message = '';

    public function output(string $cmd = '', int $code = 0, string $message = '', $data = null): string
    {
        $cmd      = $cmd ?? $this->cmd;
        $pushData = [
            'code'    => $code,
            'message' => $message,
            'cmd'     => $cmd,
            'data'    => $data
        ];
        return json_encode($pushData);
    }
}
