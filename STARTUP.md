# Startup commands

```bash
# development (infra)
docker compose --env-file .env.development --profile dev down
docker compose --env-file .env.development --profile dev build --no-cache
docker compose --env-file .env.development --profile dev up -d

# production (infra + backend)
docker compose --env-file .env.production --profile prod up -d
docker compose --env-file .env.production --profile prod  up -d --build

# stop
docker compose --env-file .env.development --profile dev down
docker compose --env-file .env.production --profile prod down

# Drizzle
npx drizzle-kit generate --config=src/configs/drizzle.config.ts
npx drizzle-kit push --config=src/configs/drizzle.config.ts

# dev startup
npm install
docker compose --env-file .env.development --profile dev up -d
npm run db:generate
npm run db:push
npm run seed
npm run dev

# after making changes to schema
npm run db:generate
npm run db:push or db:migrate
npm run seed:destroy
npm run seed
npm run dev

# prod startup
docker compose --env-file .env.production --profile prod up -d --build
docker exec -it bf-backend npm run db:migrate:prod
```