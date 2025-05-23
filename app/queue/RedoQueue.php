<?php

namespace app\queue;

use app\enums\StrokeStatus;
use app\model\Stroke;
use Webman\RedisQueue\Consumer;

class RedoQueue implements Consumer
{

    public $queue = 'Redo';

    /**
     * @param int $data
     * @return void
     */
    public function consume($data)
    {
        Stroke::update([
            'status' => StrokeStatus::NORMAL->value,
        ], ['stroke_id' => $data]);
    }
}
