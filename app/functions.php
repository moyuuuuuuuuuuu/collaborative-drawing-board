<?php
/**
 * Here is your custom functions.
 */
function uuid()
{
    $randomString = substr(str_shuffle(str_repeat('0123456789abcdefghijklmnopqrstuvwxyz', 5)), 0, 10);
    $timestamp = time();
    return $randomString . base_convert($timestamp, 10, 36);
}
