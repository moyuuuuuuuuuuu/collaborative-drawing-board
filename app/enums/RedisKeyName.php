<?php

namespace app\enums;

enum RedisKeyName: string
{
    case LINESEGMENT_QUEUE_NAME = 'LineSegment';
    case JOIN_ROOM_QUEUE_NAME   = 'JoinRoom';
    case LEAVE_ROOM_QUEUE_NAME  = 'LeaveRoom';
    case UNDO_QUEUE_NAME        = 'Undo';
    case REDO_QUEUE_NAME        = 'Redo';
    case INFO                   = 'room:%s:info';
    case STROKE_LIST_NAME       = 'room:%s:stroke:%s';
    case STROKE_SCORE_NAME      = 'room:%s:score:stroke:%s';
    case POINT_LIST_NAME        = 'room:%s:points:%s:%s';
    case POINT_HASH_NAME        = 'room:%s:point:%s:%s';
    case REDO_LIST_NAME         = 'room:%s:redo:%s';
    case REDO_SCORE_NAME        = 'room:%s:score:redo:%s';
    case MEMBER_LIST_NAME       = 'room:%s:members';


}
