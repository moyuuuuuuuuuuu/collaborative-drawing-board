<?php
/**
 * This file is part of webman.
 *
 * Licensed under The MIT License
 * For full copyright and license information, please see the MIT-LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @author    walkor<walkor@workerman.net>
 * @copyright walkor<walkor@workerman.net>
 * @link      http://www.workerman.net/
 * @license   http://www.opensource.org/licenses/mit-license.php MIT License
 */

return [
    'default' => [
        'password' => getenv('REDIS_PASSWORD'),
        'host' => getenv('REDIS_HOST'),
        'port' => getenv('REDIS_PORT'),
        'database' => getenv('REDIS_DATABASE'),
        'pool' => [
            'max_connections' => getenv('REDIS_POOL_MAX_CONNECTIONS'),
            'min_connections' => getenv('REDIS_POOL_MIN_CONNECTIONS'),
            'wait_timeout' => getenv('REDIS_POOL_WAIT_TIMEOUT'),
            'idle_timeout' => getenv('REDIS_POOL_IDLE_TIMEOUT'),
            'heartbeat_interval' => getenv('REDIS_POOL_HEARTBEAT_INTERVAL'),
        ],
    ]
];
