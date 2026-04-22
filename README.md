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

### Deploy for FREE

See **FREE_DEPLOYMENT_GUIDE.md** for step-by-step instructions to deploy on Render + Vercel (100% free for testing).

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

- **FREE_DEPLOYMENT_GUIDE.md** - Deploy for free on Render + Vercel
- **DISCORD_SETUP_GUIDE.md** - Setup Discord OAuth application

## 🔑 Environment Variables

See `.env.example` files in backend and frontend directories.

## 📝 License

MIT License - feel free to use for your own streaming community!

## 🆘 Support

For issues or questions, check the documentation files or create an issue on GitHub.

---

Built with ❤️ for streaming communities
