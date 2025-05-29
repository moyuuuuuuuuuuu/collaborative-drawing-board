<?php

namespace app\service\draw;

use Workerman\Connection\TcpConnection;

/**
 * 消息发送助手
 */
class Messager
{

    static
    function unpack(string $rawData): ?array
    {
        if (strlen($rawData) < 4) {
            return null;
        }

        // 第 1 步：读取前4字节为 JSON 长度（大端）
        $jsonLength = unpack('N', substr($rawData, 0, 4))[1];

        // 第 2 步：提取 JSON 内容
        $jsonString = substr($rawData, 4, $jsonLength);
        $meta       = json_decode($jsonString, true);

        if ($meta === null) {
            return null;
        }

        // 第 3 步：提取二进制数据
        $binaryData = substr($rawData, 4 + $jsonLength);

        return [
            $meta['cmd'] ?? null,
            $meta['data'] ?? [],
            $binaryData,
        ];
    }

    static function pack(string $cmd, string $message, array $data, string $binaryBuffer = null): string
    {
        // 1. JSON 信息封装
        $meta       = [
            'cmd'     => $cmd,
            'data'    => $data,
            'message' => $message,
        ];
        $json       = json_encode($meta);
        $jsonBytes  = $json;  // JSON 字符串已经是 UTF-8 编码，不需要额外转换
        $jsonLength = strlen($jsonBytes);  // 获取 JSON 字节长度

        $binaryBytes = $binaryBuffer ?? '';  // 如果有二进制数据，则使用它

        $totalLength = 4 + $jsonLength + strlen($binaryBytes);

        $fullBuffer = '';

        $fullBuffer .= pack('N', $jsonLength);  // 使用 PHP 的 pack() 函数将长度写入

        $fullBuffer .= $jsonBytes;

        $fullBuffer .= $binaryBytes;
        return $fullBuffer;
    }

    /**
     * 单播
     * @param TcpConnection $connection
     * @param string $cmd
     * @param string $message
     * @param array $data
     * @return void
     */
    static function unicast(TcpConnection $connection, string $cmd, string $message = '', array $data = [], $binaryBuffer = null)
    {
        $connection->send(self::pack($cmd, $message, $data, $binaryBuffer));
    }

    /**
     * 广播
     * @param TcpConnection $connection
     * @param string $cmd
     * @param string $message
     * @param array $data
     * @return void
     */
    static function broadcast(string $cmd, string $message, array $data, array $ignore = [], $binaryBuffer = null)
    {
        $connectionList = RoomManager::getAllMembers();
        foreach ($connectionList as $roomConnectionList) {
            foreach ($roomConnectionList as $clientId => $roomConnection) {
                if (in_array($clientId, $ignore)) {
                    continue;
                }
                self::unicast($roomConnection, $cmd, $message, $data, $binaryBuffer);
            }
        }
    }

    /**
     * 组播
     * @param string $roomId
     * @param string $cmd
     * @param string $message
     * @param array $data
     * @return void
     */
    static function multicast(string $roomId, string $cmd, string $message, array $data, array $ignore = [], $binaryBuffer = null)
    {
        $connections = \app\service\draw\RoomManager::getMembers($roomId);
        foreach ($connections as $clientId => $connection) {
            if (in_array($clientId, $ignore)) {
                continue;
            }
            self::unicast($connection, $cmd, $message, $data, $binaryBuffer);
        }
    }
}
