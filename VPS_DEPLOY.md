# LeadFlow — деплой на VPS (Ubuntu 24.04)

Пошаговая инструкция для сервера **fb.nasytko.ru** (IP: **31.129.102.78**).

Копируйте команды **блоками**, сверху вниз. После каждого шага смотрите раздел «Проверка».

---

## Что будет запущено

| Сервис    | Назначение                          |
|-----------|-------------------------------------|
| **web**   | Сайт LeadFlow (порт 3000 внутри)    |
| **worker**| Обработка лидов из очереди          |
| **postgres** | База данных                    |
| **redis** | Очередь задач                       |

Снаружи открыты только **80** и **443** (через Nginx). Docker поднимает всё остальное сам.

---

## Шаг 0. Подготовка (до входа на сервер)

### 0.1 DNS

В панели домена создайте A-запись:

```
fb.nasytko.ru  →  31.129.102.78
```

Подождите 5–30 минут, пока DNS обновится.

### 0.2 Подключение к серверу

С вашего компьютера:

```bash
ssh root@31.129.102.78
```

Если используете другого пользователя:

```bash
ssh ваш_пользователь@31.129.102.78
```

> Дальнейшие команды выполняются **на сервере**, если не указано иное.

---

## Шаг 1. Обновление системы

```bash
sudo apt update
sudo apt upgrade -y
```

**Проверка:** ошибок `E:` или `Failed` быть не должно.

---

## Шаг 2. Установка Docker и Git

```bash
sudo apt install -y ca-certificates curl gnupg git
```

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```bash
sudo systemctl enable --now docker
```

**Проверка:**

```bash
docker --version
docker compose version
```

Должны показаться версии Docker и Docker Compose.

### 2.1 (Рекомендуется) Запуск Docker без sudo

```bash
sudo usermod -aG docker $USER
```

Выйдите и зайдите снова по SSH:

```bash
exit
```

```bash
ssh root@31.129.102.78
```

**Проверка:**

```bash
docker ps
```

Должна быть пустая таблица контейнеров (без ошибки `permission denied`).

---

## Шаг 3. Файрвол (безопасность)

Открываем только SSH, HTTP и HTTPS:

```bash
sudo apt install -y ufw
```

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

```bash
sudo ufw enable
```

На вопрос `Proceed with operation (y|n)?` введите **y** и Enter.

**Проверка:**

```bash
sudo ufw status
```

Должны быть `OpenSSH`, `80/tcp`, `443/tcp` — `ALLOW`.

---

## Шаг 4. Скачивание проекта

```bash
sudo mkdir -p /opt/leadflow
sudo chown -R $USER:$USER /opt/leadflow
cd /opt/leadflow
```

Замените URL на адрес **вашего** репозитория и выполните:

```bash
git clone https://github.com/ВАШ_АККАУНТ/leadflow.git .
```

Если репозиторий приватный — используйте SSH или токен.

**Проверка:**

```bash
ls -la
```

Должны быть файлы `docker-compose.yml`, `Dockerfile`, `package.json`.

---

## Шаг 5. Создание файла `.env`

Одна команда создаст `.env` и **автоматически сгенерирует** секреты:

```bash
cd /opt/leadflow

cat > .env << 'EOF'
DATABASE_URL=postgresql://leadflow:leadflow@postgres:5432/leadflow?schema=public
REDIS_URL=redis://redis:6379
NEXTAUTH_URL=https://fb.nasytko.ru
FACEBOOK_REDIRECT_URI=https://fb.nasytko.ru/api/facebook/callback
NODE_ENV=production
META_APP_ID=
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
EOF

echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
```

> **Важно:** файл `.env` содержит секреты. Никому не отправляйте и не коммитьте в Git.

**Проверка:**

```bash
cat .env
```

Должны быть заполнены `NEXTAUTH_SECRET` и `ENCRYPTION_KEY` (длинные случайные строки).

### 5.1 (Опционально) Meta-ключи в `.env`

Если хотите задать Meta-ключи на уровне сервера (пользователи также могут настроить их в UI):

```bash
nano .env
```

Заполните при необходимости:

```
META_APP_ID=ваш_app_id
META_APP_SECRET=ваш_app_secret
META_WEBHOOK_VERIFY_TOKEN=ваш_токен_webhook
META_WEBHOOK_SIGNATURE_REQUIRED=true
META_LOGIN_CONFIG_ID=123456789012345
DEPLOYMENT_MODE=saas
```

> **Важно:** `META_LOGIN_CONFIG_ID` — только **числовой** ID из Meta Login for Business. Не email и не произвольный текст.

### Очистка ошибочного config_id в БД

Если в OAuth URL попал email вместо Configuration ID:

```sql
UPDATE integration_settings SET "metaLoginConfigId" = NULL WHERE "metaLoginConfigId" LIKE '%@%';
UPDATE facebook_connections SET "metaLoginConfigIdAtAuth" = NULL WHERE "metaLoginConfigIdAtAuth" LIKE '%@%';
```

После этого задайте правильный ID в `.env` (`META_LOGIN_CONFIG_ID`) или переподключите Facebook.

Сохранение в nano: `Ctrl+O`, Enter, выход: `Ctrl+X`.

---

## Шаг 6. Запуск LeadFlow

Первый запуск займёт **5–15 минут** (скачивание образов и сборка).

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml up -d --build
```

**Проверка статуса:**

```bash
docker compose -f docker-compose.production.yml ps
```

Ожидаемый результат:

| Сервис   | STATUS              |
|----------|---------------------|
| postgres | running (healthy)     |
| redis    | running (healthy)     |
| web      | running             |
| worker   | running             |
| migrate  | exited (0)          |

`migrate` с `exited` — это нормально: миграции выполнились и завершились.

**Проверка логов:**

```bash
docker compose -f docker-compose.production.yml logs --tail=50 web
```

```bash
docker compose -f docker-compose.production.yml logs --tail=50 worker
```

В логах worker должно быть: `LeadFlow worker ready`.

Смотреть логи в реальном времени (выход: `Ctrl+C`):

```bash
docker compose -f docker-compose.production.yml logs -f --tail=100
```

**Проверка сайта локально на сервере:**

```bash
curl -I http://127.0.0.1:3000/ru/login
```

Должно быть `HTTP/1.1 200` или `HTTP/1.1 307`.

> **Важно (production):** PostgreSQL и Redis **не публикуются наружу** и доступны только внутри Docker network (это безопаснее).

---

## Шаг 7. Установка Nginx (reverse proxy)

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

Создаём конфиг одной командой:

```bash
sudo tee /etc/nginx/sites-available/fb.nasytko.ru > /dev/null << 'EOF'
server {
    listen 80;
    server_name fb.nasytko.ru;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF
```

Активируем сайт:

```bash
sudo ln -sf /etc/nginx/sites-available/fb.nasytko.ru /etc/nginx/sites-enabled/fb.nasytko.ru
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

**Проверка:**

```bash
curl -I http://fb.nasytko.ru/ru/login
```

Должен быть ответ `200` или `307`.

Откройте в браузере: **http://fb.nasytko.ru/ru/login**

---

## Шаг 8. SSL-сертификат (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

```bash
sudo certbot --nginx -d fb.nasytko.ru
```

Certbot задаст вопросы:

1. Email — введите ваш email (для уведомлений об истечении сертификата)
2. Terms of Service — **Y**
3. Redirect HTTP → HTTPS — выберите **2** (рекомендуется)

**Проверка:**

```bash
curl -I https://fb.nasytko.ru/ru/login
```

Должно быть `HTTP/2 200` или `307`.

Откройте в браузере: **https://fb.nasytko.ru/ru/login**

---

## Шаг 9. Настройка Meta (Facebook)

Откройте [developers.facebook.com](https://developers.facebook.com) → ваше приложение.

### 9.1 Facebook Login for Business

**Settings → Valid OAuth Redirect URIs:**

```
https://fb.nasytko.ru/api/facebook/callback
```

**Configuration (обязательно для страниц из Business Manager):**

1. Meta Developers → ваше приложение → **Facebook Login for Business**
2. **Configurations** → **Create configuration**
3. Добавьте permissions: `pages_show_list`, `pages_read_engagement`, `leads_retrieval`, `ads_read`, `pages_manage_ads`, `business_management`
4. Включите выбор **Pages** (и при необходимости Business assets)
5. Скопируйте **Configuration ID**
6. В LeadFlow: **Facebook** → Meta App settings → поле **Facebook Login Configuration ID** (или env `META_LOGIN_CONFIG_ID`)

Без `config_id` OAuth может подключить профиль (`/me`), но `/me/accounts` вернёт пустой список, если страницы управляются через Business Manager.

Диагностика в UI: кнопка **Проверить разрешения** или API `GET /api/facebook/debug-permissions`.

### 9.2 Webhooks

**Webhooks → продукт Page** (не User!)

| Поле | Значение |
|------|----------|
| Callback URL | `https://fb.nasytko.ru/api/webhooks/meta` |
| Verify Token | тот же, что в LeadFlow (UI или `META_WEBHOOK_VERIFY_TOKEN` в `.env`) |

Подпишитесь на поле: **`leadgen`**

В production включена проверка подписи webhook (`META_WEBHOOK_SIGNATURE_REQUIRED=true` по умолчанию). Meta подписывает POST body через `X-Hub-Signature-256` с использованием `META_APP_SECRET`.

**Проверка подписи вручную (bash):**

```bash
BODY='{"object":"page","entry":[]}'
SECRET='ваш_META_APP_SECRET'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')
curl -X POST "https://fb.nasytko.ru/api/webhooks/meta" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$BODY"
```

Без заголовка или с неверной подписью в production вернётся **401**.

### 9.2.1 Security: rate limits и CSRF

- **Redis обязателен** в production для rate limit (login, register, forgot-password и др.)
- Локально при недоступном Redis используется in-memory fallback (только dev)
- Dashboard API (POST/PATCH/DELETE) требует CSRF: клиент получает токен через `GET /api/csrf`
- Самопроверка: `npm run security:check`

### 9.3 Permissions

- `public_profile`
- `email`
- `pages_show_list`
- `pages_read_engagement`
- `leads_retrieval`
- `ads_read`
- `pages_manage_ads`
- `business_management`

---

## Шаг 10. Первый запуск в приложении

1. Откройте **https://fb.nasytko.ru/ru/register** — создайте аккаунт
2. Перейдите в **Facebook** — настройте Meta App (App ID, Secret, Webhook Token)
3. Нажмите **Подключить Facebook**
4. Включите страницы и формы
5. Настройте **Telegram** — бот и Chat ID
6. Отправьте тестовое сообщение

---

## Шаг 11. Финальная проверка

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml ps
```

```bash
curl -I https://fb.nasytko.ru/ru/login
```

```bash
docker compose -f docker-compose.production.yml logs worker --tail=20 | grep -i ready
```

Чеклист:

- [ ] https://fb.nasytko.ru/ru/login открывается
- [ ] Регистрация работает
- [ ] Facebook OAuth проходит без ошибки redirect
- [ ] Webhook в Meta подтверждён (зелёная галочка)
- [ ] Worker в логах: `LeadFlow worker ready`
- [ ] Telegram тестовое сообщение приходит

---

## Обновление приложения

Когда выйдет новая версия:

```bash
cd /opt/leadflow
git pull
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
```

---

## Полезные команды

### Перезапуск всех сервисов

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml restart
```

### Остановка

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml down
```

> **Внимание:** `docker compose -f docker-compose.production.yml down` останавливает контейнеры, но **не удаляет** данные БД (они в volume).

### Логи конкретного сервиса

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml logs -f web
docker compose -f docker-compose.production.yml logs -f worker
docker compose -f docker-compose.production.yml logs -f postgres
```

### Пересоздать только web и worker

```bash
cd /opt/leadflow
docker compose -f docker-compose.production.yml up -d --build web worker
```

---

## Решение проблем

### Сайт не открывается

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs web --tail=100
sudo systemctl status nginx
sudo nginx -t
```

### Ошибка `NEXTAUTH_SECRET is required`

```bash
cd /opt/leadflow
cat .env | grep NEXTAUTH_SECRET
```

Если пусто — повторите Шаг 5.

### Worker не запускается

```bash
docker compose -f docker-compose.production.yml logs worker --tail=100
```

Частая причина: Redis недоступен. Проверьте:

```bash
docker compose -f docker-compose.production.yml ps redis
```

### Webhook Meta не подтверждается

1. URL точно: `https://fb.nasytko.ru/api/webhooks/meta`
2. Verify Token совпадает в Meta и LeadFlow
3. Продукт webhook: **Page**, не User
4. SSL работает: `curl -I https://fb.nasytko.ru`

### Facebook OAuth ошибка redirect

Redirect URI в Meta должен быть **точно**:

```
https://fb.nasytko.ru/api/facebook/callback
```

И в `.env`:

```
NEXTAUTH_URL=https://fb.nasytko.ru
FACEBOOK_REDIRECT_URI=https://fb.nasytko.ru/api/facebook/callback
```

---

## Сводка URL для Meta

| Назначение | URL |
|------------|-----|
| Сайт | https://fb.nasytko.ru |
| OAuth Redirect | https://fb.nasytko.ru/api/facebook/callback |
| Webhook | https://fb.nasytko.ru/api/webhooks/meta |

---

## Безопасность (кратко)

- Не публикуйте файл `.env`
- Не открывайте порты 5432 (PostgreSQL) и 6379 (Redis) в интернет — файрвол из Шага 3 это блокирует
- Регулярно обновляйте сервер: `sudo apt update && sudo apt upgrade -y`
- Certbot продлевает SSL автоматически; проверка: `sudo certbot renew --dry-run`
