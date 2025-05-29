FROM php:8.2-cli

# 安装必要的扩展和工具
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    zip \
    unzip \
    && docker-php-ext-install \
    pcntl \
    zip \
    mysqli \
    pdo_mysql \
    mbstring


# 安装 Redis 扩展
RUN pecl install redis \
    && docker-php-ext-enable redis

# 安装 Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 安装依赖
RUN composer install --no-dev --optimize-autoloader

# 暴露 Webman 端口
EXPOSE 8080 8888

# 启动 Webman
CMD ["php", "start.php", "start"]
