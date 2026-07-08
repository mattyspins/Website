# 🎰 MattySpins - Streaming Community Platform

A full-stack web application for streaming communities with Discord integration, points system, raffles, and admin dashboard.

## 🌟 Features

- **Discord OAuth Login** - Users login with Discord
- **Points System** - Earn points by watching streams
- **Raffle System** - Buy tickets with points, win prizes
- **Admin Dashboard** - Manage users, raffles, store items
- **Moderator System** - Limited admin access for moderators
- **Leaderboard** - Track top users
- **Store** - Buy items with points
- **Bonus Hunt Tracking** - Track gambling sessions

## 🚀 Quick Start

### Local Development

1. **Install Prerequisites**
   - Node.js 18+
   - Docker Desktop (for PostgreSQL and Redis)

2. **Setup Backend**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Discord credentials
   docker-compose up -d
   npx prisma migrate dev
   npm run dev
   ```

3. **Setup Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Visit** http://localhost:3000

### Deploy to Production

Deploys to Railway (backend) + Vercel (frontend). See **[RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)** for the backend environment variables, and `frontend/vercel.json` / `frontend/.env.production.example` for the frontend ones.

## 📁 Project Structure

```
├── backend/          # Node.js/Express API
│   ├── src/         # Source code
│   ├── prisma/      # Database schema & migrations
│   └── .env         # Environment variables
├── frontend/        # Next.js React app
│   ├── app/         # Pages
│   └── components/  # React components
└── docs/            # Documentation
```

## 🔧 Tech Stack

**Backend:**

- Node.js + Express
- PostgreSQL (Prisma ORM)
- Redis (caching)
- JWT authentication
- Discord OAuth

**Frontend:**

- Next.js 14
- React
- Tailwind CSS
- Framer Motion

## 📚 Documentation

### Configuration Guides

- **[RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)** - Backend environment variables
- **[CUSTOM_DOMAIN_SETUP.md](CUSTOM_DOMAIN_SETUP.md)** - Pointing a custom domain at the deployment
- **[START_LOCAL_DATABASE.md](START_LOCAL_DATABASE.md)** - Running Postgres/Redis locally for development

### Setup Guides

- **[DISCORD_SETUP_GUIDE.md](DISCORD_SETUP_GUIDE.md)** - Setup Discord OAuth application
- **[SETUP_FOR_NEW_STREAMER.md](SETUP_FOR_NEW_STREAMER.md)** - Configure for your stream
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Manual testing walkthrough

> Note: a number of other `*_SUMMARY.md` / `*_COMPLETE.md` files in the repo root are point-in-time notes written while shipping specific past features (e.g. Guess the Balance, persistent login). They're kept for history but aren't maintained as ongoing documentation — the guides above are the current, accurate ones.

## 🔑 Environment Variables

See `.env.example` files in backend and frontend directories.

## 📝 License

MIT License - feel free to use for your own streaming community!

## 🆘 Support

For issues or questions, check the documentation files or create an issue on GitHub.

---

Built with ❤️ for streaming communities
