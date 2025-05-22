<?php
$host = getenv('REDIS_QUEUE_HOST');
$port = getenv('REDIS_QUEUE_PORT');
return [
    'default' => [
        'host'    => sprintf('redis://%s:%s', $host, $port),
        'options' => [
            'auth'          => getenv('REDIS_QUEUE_PASSWORD'),
            'db'            => getenv('REDIS_QUEUE_DATABASE'),
            'prefix'        => getenv('REDIS_QUEUE_PREFIX'),
            'max_attempts'  => 5,
            'retry_seconds' => 5,
        ],
        // Connection pool, supports only Swoole or Swow drivers.
        'pool'    => [
            'max_connections'    => 5,
            'min_connections'    => 1,
            'wait_timeout'       => 3,
            'idle_timeout'       => 60,
            'heartbeat_interval' => 50,
        ]
    ],
];
