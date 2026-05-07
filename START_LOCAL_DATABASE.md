# Start Local Database - Instructions

## Step 1: Start Docker Desktop

1. **Open Docker Desktop** on your Windows machine
2. **Wait for it to fully start** (you'll see "Docker Desktop is running" in the system tray)

## Step 2: Start Database Containers

Open a terminal in the `backend` folder and run:

```bash
cd backend
docker-compose up -d postgres redis
```

This will:

- Start PostgreSQL on `localhost:5432`
- Start Redis on `localhost:6379`
- Run in detached mode (background)

## Step 3: Verify Containers Are Running

```bash
docker ps
```

You should see:

- `streaming-postgres` (PostgreSQL)
- `streaming-redis` (Redis)

## Step 4: Run the Migration

Once the containers are running, run:

```bash
npx prisma migrate dev --name add_guess_the_balance
```

This will:

- Create the migration file
- Apply it to your local database
- Create the `guess_the_balance` and `guess_submissions` tables

## Step 5: Verify Migration

```bash
npx prisma studio
```

This opens Prisma Studio in your browser where you can:

- See all tables including the new ones
- View/edit data
- Verify the schema is correct

---

## Alternative: Use Existing PostgreSQL

If you have PostgreSQL installed locally (not Docker):

1. **Make sure PostgreSQL is running**
2. **Create the database** (if it doesn't exist):
   ```sql
   CREATE DATABASE streaming_backend;
   ```
3. **Run the migration**:
   ```bash
   cd backend
   npx prisma migrate dev --name add_guess_the_balance
   ```

---

## Troubleshooting

### Docker Desktop Not Starting

- Restart your computer
- Check if WSL 2 is installed (required for Docker Desktop on Windows)
- Check Docker Desktop settings

### Port Already in Use

If port 5432 or 6379 is already in use:

```bash
# Stop existing containers
docker-compose down

# Or change ports in docker-compose.yml
```

### Migration Fails

- Check DATABASE_URL in `.env` is correct
- Verify PostgreSQL is running: `docker ps`
- Check logs: `docker logs streaming-postgres`

---

## Once Database is Running

Let me know and I'll continue with:

1. Running the migration
2. Implementing the backend code (Phase 2)
3. Testing the API endpoints

**Reply with "database is running" when ready!**
