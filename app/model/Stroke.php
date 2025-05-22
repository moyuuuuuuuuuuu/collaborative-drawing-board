<?php

namespace app\model;

use support\think\Model;

class Stroke extends Model
{
    public    $table              = 'stroke';
    protected $autoWriteTimestamp = true;
    protected $createTime         = 'create_at';
}
