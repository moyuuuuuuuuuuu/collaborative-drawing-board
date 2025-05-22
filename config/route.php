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

use app\controller\LoginController;
use app\controller\RoomController;

\Webman\Route::any('/r/{s}', [RoomController::class, 'index'])->middleware([\app\middleware\AuthorizationMiddleware::class]);
\Webman\Route::get('/s/{roomId}', [RoomController::class, 'stream'])->middleware([\app\middleware\AuthorizationMiddleware::class]);
\Webman\Route::post('/loginGuest', [LoginController::class, 'guest']);
\Webman\Route::post('/rooms', [RoomController::class, 'list']);
\Webman\Route::post('/rooms/joined', [RoomController::class, 'joinedList']);
