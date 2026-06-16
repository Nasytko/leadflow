# LeadFlow — Руководство по публикации в production

Полная инструкция по развёртыванию LeadFlow на боевом сервере.

---

## Требования к серверу

### Минимальная конфигурация (до ~1000 лидов/день)

| Компонент | Требование |
|-----------|------------|
| **CPU** | 2 vCPU |
| **RAM** | 2 GB (web + worker + система) |
| **Диск** | 20 GB SSD |
| **ОС** | Linux (Ubuntu 22.04+, Debian 12+) или контейнерная платформа |

### Рекомендуемая конфигурация (production)

| Компонент | Требование |
|-----------|------------|
| **CPU** | 4 vCPU |
| **RAM** | 4–8 GB |
| **Диск** | 40 GB SSD |

### Обязательные сервисы

LeadFlow состоит из **4 компонентов**. Все обязательны в production:

```
┌─────────────┐     ┌─────────────┐
│   Web App   │────▶│ PostgreSQL  │  ← данные пользователей, лиды
│  (Next.js)  │     │    16+      │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│    Redis    │◀────│   Worker    │  ← обработка лидов, очередь BullMQ
│     7+      │     │  (BullMQ)   │
└─────────────┘     └─────────────┘
       ▲
       │ webhook
┌──────┴──────┐
│  Meta (FB)  │
└─────────────┘
```

| Сервис | Технология | Назначение |
|--------|------------|------------|
| **Web** | Next.js 15 (standalone) | UI, API, авторизация |
| **Worker** | Node.js + BullMQ | Обработка лидов, retry, импорт |
| **PostgreSQL** | 16+ | База данных (Prisma ORM) |
| **Redis** | 7+ | Очередь задач, rate limit, OAuth state |

> **Важно:** Web и Worker — **отдельные процессы**. Worker обязателен: без него лиды не обрабатываются.

### Сетевые требования

- Публичный HTTPS-домен (Meta не принимает HTTP для webhook/OAuth в production)
- Открытый порт **443** (HTTPS)
- Исходящий доступ к `graph.facebook.com`, `api.telegram.org`

---

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

### Обязательные переменные

| Переменная | Описание | Как получить |
|------------|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | Из плагина Postgres / docker-compose |
| `REDIS_URL` | Redis connection string | Из плагина Redis / docker-compose |
| `NEXTAUTH_SECRET` | Секрет сессий NextAuth | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Публичный URL приложения | `https://your-domain.com` |
| `ENCRYPTION_KEY` | AES-256 ключ (64 hex) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | Режим | `production` |

### Опциональные (платформенные дефолты Meta)

Пользователи могут настроить Meta App через UI. Платформенные дефолты:

| Переменная | Описание |
|------------|----------|
| `META_APP_ID` | ID приложения Meta |
| `META_APP_SECRET` | Secret приложения Meta |
| `META_WEBHOOK_VERIFY_TOKEN` | Токен верификации webhook |
| `FACEBOOK_REDIRECT_URI` | OAuth callback (по умолчанию: `{NEXTAUTH_URL}/api/facebook/callback`) |

### Критично

- `ENCRYPTION_KEY` **должен совпадать** на Web и Worker
- `NEXTAUTH_URL` — точный публичный URL с `https://`
- В production **обязательны** `DATABASE_URL` и `REDIS_URL`

---

## Способ 1: Docker Compose (VPS / свой сервер)

Подходит для VPS (Hetzner, DigitalOcean, Timeweb, Selectel и т.д.).

### 1. Подготовка сервера

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
```

### 2. Клонирование и настройка

```bash
git clone <your-repo-url> leadflow
cd leadflow
cp .env.example .env
```

Заполните `.env`:

```env
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com
ENCRYPTION_KEY=<64 hex chars>
```

### 3. Запуск

```bash
docker compose up --build -d
```

Docker Compose автоматически:
1. Поднимает PostgreSQL и Redis
2. Выполняет `prisma migrate deploy`
3. Запускает Web (порт 3000) и Worker

### 4. Reverse proxy (Nginx + SSL)

Пример конфигурации Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

SSL через Certbot:

```bash
sudo certbot --nginx -d your-domain.com
```

### 5. Проверка

```bash
# Web отвечает
curl -I https://your-domain.com/ru/login

# Worker работает
docker compose logs worker | grep "worker ready"

# Миграции применены
docker compose logs migrate
```

---

## Способ 2: Railway (рекомендуется для быстрого старта)

### 1. Создайте проект на [railway.app](https://railway.app)

Добавьте плагины:
- **PostgreSQL**
- **Redis**

### 2. Сервис Web

1. Подключите GitHub-репозиторий
2. Railway обнаружит `Dockerfile` и `railway.json`
3. Установите переменные:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
NEXTAUTH_SECRET=<сгенерировать>
NEXTAUTH_URL=https://your-app.up.railway.app
ENCRYPTION_KEY=<64 hex>
NODE_ENV=production
```

### 3. Сервис Worker

1. Добавьте новый сервис из того же репозитория
2. **Dockerfile Path:** `Dockerfile.worker`
3. Те же переменные, что у Web (кроме `NEXTAUTH_URL` — опционально)
4. Публичный порт **не нужен**

### 4. Миграции БД

В Railway Shell (Web или Worker):

```bash
npx prisma migrate deploy
```

Или локально с production `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

### 5. Домен

Railway → Settings → Domains → добавьте домен или используйте `*.up.railway.app`.

Обновите `NEXTAUTH_URL` на финальный URL.

---

## Настройка Meta App (Facebook)

После деплоя настройте приложение Meta:

### Facebook Login

1. [developers.facebook.com](https://developers.facebook.com) → ваше приложение
2. Facebook Login for Business → Settings
3. **Valid OAuth Redirect URIs:**
   ```
   https://your-domain.com/api/facebook/callback
   ```

### Webhooks

1. Webhooks → продукт **Page** (не User!)
2. **Callback URL:**
   ```
   https://your-domain.com/api/webhooks/meta
   ```
3. **Verify Token:** тот же, что в LeadFlow (UI → Facebook → Webhook Verify Token)
4. Подписка на поле **`leadgen`**

### Permissions

- `pages_show_list`
- `pages_read_engagement`
- `leads_retrieval`
- `ads_read`
- `pages_manage_ads`

### Live mode

Переведите приложение в **Live** после проверки Meta. В Development лиды принимаются только от тестовых пользователей.

---

## Чеклист после деплоя

- [ ] `https://your-domain.com/ru/login` открывается
- [ ] Worker запущен (`LeadFlow worker ready` в логах)
- [ ] `prisma migrate deploy` выполнен без ошибок
- [ ] Redis доступен (лиды обрабатываются)
- [ ] `ENCRYPTION_KEY` одинаковый на Web и Worker
- [ ] Meta OAuth Redirect URI совпадает с production URL
- [ ] Meta Webhook подтверждён и подписан на `leadgen`
- [ ] Тестовый пользователь: регистрация → Facebook → Telegram → тестовый лид

---

## Локальная разработка

Для разработки используйте Docker Compose (только инфраструктура):

```bash
docker compose up postgres redis -d
cp .env.example .env
npm install
npm run db:migrate:dev
```

Терминал 1:
```bash
npm run dev
```

Терминал 2:
```bash
npm run worker
```

Откройте http://localhost:3000/ru

---

## Масштабирование

| Компонент | Как масштабировать |
|-----------|-------------------|
| Web | Несколько реплик за load balancer |
| Worker | Несколько реплик или увеличить `concurrency` в `lib/queue.ts` |
| PostgreSQL | Увеличить tier / managed Postgres |
| Redis | Увеличить tier / managed Redis |

---

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| OAuth Facebook не работает | `FACEBOOK_REDIRECT_URI` / Meta Redirect URI должны совпадать точно |
| Webhook не подтверждается | Публичный HTTPS URL + совпадение Verify Token |
| Лиды не обрабатываются | Проверьте Worker и `REDIS_URL` |
| Ошибки шифрования | `ENCRYPTION_KEY` одинаковый на Web и Worker |
| Telegram не отправляет | Токен бота, Chat ID, логи Worker |
| 429 Too Many Requests | Redis должен быть доступен для rate limit |

---

## Структура production-деплоя

```
your-domain.com (HTTPS)
        │
        ▼
   [Nginx/Caddy]  →  Web :3000  →  PostgreSQL
                          │              ▲
                          ▼              │
                        Redis  ←  Worker ┘
                          ▲
                          │
                    Meta Webhook
```

Подробнее об архитектуре: [ARCHITECTURE.md](ARCHITECTURE.md)

Краткий Railway-гайд: [RAILWAY.md](RAILWAY.md)
