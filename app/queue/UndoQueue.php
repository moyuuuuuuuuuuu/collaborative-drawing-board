<?php

namespace app\queue;

use app\enums\StrokeStatus;
use app\model\Stroke;
use Webman\RedisQueue\Consumer;

class UndoQueue implements Consumer
{

    public $queue = 'Undo';

    /**
     * @param int $data
     * @return void
     */
    public function consume($data)
    {
        Stroke::update([
            'status' => StrokeStatus::UNDO->value,
        ], ['stroke_id' => $data]);
    }
}
