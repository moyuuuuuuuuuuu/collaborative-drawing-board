<?php

namespace app\model;

use support\think\Model;

class RoomMember extends Model
{
    protected $table              = 'room_member';
    protected $autoWriteTimestamp = true;
    protected $createTime         = 'join_at';
}
