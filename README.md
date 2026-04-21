# deploy_mini (PriceHawk)

Repo gồm:
- `backend/`: Spring Boot (Maven, Java 17), PostgreSQL, Flyway, Swagger UI
- `frontend/`: React + Vite

## Chạy local (Backend + Frontend)

### 1) Backend

#### 1.1. Tạo file `backend/.env` (đầy đủ – theo yêu cầu)

Tạo file `deploy_mini/backend/.env` với nội dung:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
SPRING_DATASOURCE_USERNAME=postgres.astkanfsacxriwprspqr
SPRING_DATASOURCE_PASSWORD=PriceHawl123@
PORT=8080
```

#### 1.2. Cấu hình `application.yml` (nguyên khối – theo yêu cầu)

Ví dụ cấu hình Spring Boot (dạng hard-code) bạn đưa:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
    username: postgres.astkanfsacxriwprspqr
    password: "PriceHawl123@"
    driver-class-name: org.postgresql.Driver

    hikari:
      maximum-pool-size: 3
      minimum-idle: 1
      idle-timeout: 10000
      max-lifetime: 30000
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        default_schema: public

  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

server:
  port: 8080

logging:
  level:
    root: DEBUG
  file:
    name: logs/app.log
  pattern:
    file: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  logback:
    rollingpolicy:
      max-file-size: 10MB
      max-history: 30
```

Lưu ý: dự án hiện tại đã được cấu hình để đọc biến môi trường từ `backend/.env` (local) và từ env vars khi deploy.

#### 1.3. Chạy backend

```bash
cd backend
mvn spring-boot:run
```

Backend chạy tại:
- Health check: `http://localhost:8080/health`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

### 2) Frontend

#### 2.1. Tạo file `frontend/.env` (đầy đủ – theo yêu cầu)

Tạo file `deploy_mini/frontend/.env` với nội dung:

```env
## Frontend → Backend API (dev local)
# Nếu bạn chạy `npm run dev` thì Vite đã proxy `/api` sang `http://localhost:8080`.
# Có thể để trống VITE_API_BASE_URL để dùng proxy và tránh CORS.
VITE_API_BASE_URL=

# Bật gọi API trending deals (GET /api/trending-deals)
VITE_USE_TRENDING_API=true
```

#### 2.2. Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend thường chạy ở:
- `http://localhost:5173`

## Deploy

### Frontend (Vercel)

Thiết lập env variables trên Vercel (Production):
- `VITE_API_BASE_URL=https://deploy-mini-backend.onrender.com/api`
- `VITE_USE_TRENDING_API=true`

Sau đó redeploy.

### Backend (Render)

Backend deploy trên Render (Docker). Các env vars cần set trên Render:
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `PORT` (Render thường tự inject)

Sau khi deploy xong, test:
- `https://deploy-mini-backend.onrender.com/health`
- `https://deploy-mini-backend.onrender.com/swagger-ui/index.html`

## Quick test endpoints

- Trending deals: `GET /api/trending-deals`
- Search sản phẩm: `GET /api/products/search?q=kem`
- Wishlist: `GET /api/wishlist/{userId}`