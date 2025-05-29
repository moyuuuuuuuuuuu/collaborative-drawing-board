<?php

namespace app\model;

use support\think\Model;

/**
 * @property int $id,
 * @property int $creator_id,
 */
class Room extends Model
{
    protected $table              = 'room';
    protected $autoWriteTimestamp = true;
    protected $createTime         = 'create_at';
}
