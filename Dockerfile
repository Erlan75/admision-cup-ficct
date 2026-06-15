# ==========================================
# STAGE 1: FRONTEND BUILD (React / Vite)
# ==========================================
FROM node:18-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: BACKEND & ENGINE (Laravel PHP-FPM)
# ==========================================
FROM php:8.2-fpm-alpine
WORKDIR /var/www

# Instalar dependencias del sistema y extensiones PHP para PostgreSQL y rendimiento
RUN apk update && apk add --no-cache \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    postgresql-dev \
    oniguruma-dev

# Instalar extensiones nativas de PHP
RUN docker-php-ext-install pdo pdo_pgsql pgsql mbstring xml bcmath opcache

# Copiar Composer desde la imagen oficial
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copiar toda la aplicación Laravel
COPY . .

# Copiar los assets compilados desde el Stage 1 (Frontend)
COPY --from=frontend /app/public/build ./public/build

# Instalar dependencias del backend optimizadas para producción
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Configurar permisos para directorios de almacenamiento y cache
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache \
    && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Exponer el puerto de PHP-FPM
EXPOSE 9000

CMD ["sh", "-c", "php artisan migrate:fresh --force && php load_sql.php && php tinker_seed.php && php-fpm"]
