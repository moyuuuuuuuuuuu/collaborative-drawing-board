<?php
/**
 * Here is your custom functions.
 */

function static_path(string $path = '')
{
    return public_path('static/' . $path);
}

function images_path(string $path = '')
{
    return static_path('images/' . $path);
}

function uploads_path(string $path = '')
{
    return public_path('uploads/' . $path);
}

function js_path(string $path = '')
{
    return static_path('js/' . $path);
}

/**
 * Generate a random username.
 * @return string
 */
function generateUserName()
{
    $adjectives = [
        '快乐的', '神秘的', '勇敢的', '调皮的', '安静的',
        '呆萌的', '冷酷的', '憨憨的', '聪明的', '疯狂的'
    ];

    $animals = [
        '小猫', '海豚', '猎豹', '松鼠', '仓鼠',
        '小狗', '狐狸', '斑马', '熊猫', '鸽子'
    ];

    $adjective = $adjectives[array_rand($adjectives)];
    $animal    = $animals[array_rand($animals)];
    $number    = rand(100, 999);

    return $adjective . $animal . $number;
}

function generatePassword(int $length = 12, bool $useSpecialChars = true): string
{
    $letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $numbers = '0123456789';
    $special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    $characters = $letters . $numbers;
    if ($useSpecialChars) {
        $characters .= $special;
    }

    $password = '';
    $maxIndex = strlen($characters) - 1;

    for ($i = 0; $i < $length; $i++) {
        $password .= $characters[random_int(0, $maxIndex)];
    }

    return $password;
}

