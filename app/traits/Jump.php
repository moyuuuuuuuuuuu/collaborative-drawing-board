<?php

namespace app\traits;

use support\Response;

trait Jump
{
    public function res(int $code = 1, string $message = '', array $data = []): Response
    {
        return json([
            'code'    => $code,
            'message' => $message,
            'data'    => $data
        ]);
    }
}
