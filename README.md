# Show App

A full-stack application with React frontend, Node.js backend, Prisma ORM, Neon DB, and JWT authentication with Apple-inspired UI.

## Tech Stack

- **Frontend**: React, Tailwind CSS, Vite, React Router
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Neon DB)
- **ORM**: Prisma
- **Authentication**: JWT tokens
- **UI**: Apple-inspired minimalist design

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Neon DB account (or any PostgreSQL database)

### 1. Install Dependencies

```bash
npm run install-all
```

Or install manually:

```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a Neon DB account at [neon.tech](https://neon.tech)
2. Create a new database project
3. Copy your connection string
4. Update `backend/.env` with your database URL:

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
PORT=5000
```

### 3. Initialize Database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### 4. Run the Application

```bash
# From root directory
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`

Or run separately:

```bash
# Backend
npm run server

# Frontend (in another terminal)
npm run client
```

## Project Structure

```
show/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Authentication routes (login, register)
│   │   └── protected.js     # Protected routes
│   ├── utils/
│   │   └── database.js      # Prisma client instance
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── server.js            # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # Auth context
│   │   ├── pages/           # Page components
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── package.json
│   └── vite.config.js
└── package.json
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires token)

### Protected Routes

- `GET /api/protected/dashboard` - Protected dashboard route (requires token)

## Environment Variables

### Backend (.env)

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 5000)

## Features

- ✅ User registration and login
- ✅ JWT token authentication
- ✅ Protected routes
- ✅ Apple-inspired UI design
- ✅ Responsive design
- ✅ Password hashing with bcrypt
- ✅ Prisma ORM with PostgreSQL

## Development

### Database Migrations

```bash
cd backend
npm run prisma:migrate      # Create migration
npm run prisma:studio       # Open Prisma Studio
npm run prisma:generate     # Generate Prisma Client
```

### Build for Production

```bash
cd frontend
npm run build
```

The production build will be in the `frontend/dist` directory.

## License

ISC

# capstone
