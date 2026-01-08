# Child Event Assistant

A modern Next.js application built with TypeScript, Tailwind CSS, Prisma, and NextAuth v5.

## Tech Stack

- **Next.js 16.1.1** - React framework with App Router
- **React 19** - Latest React version
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS v4** - Utility-first CSS framework with mobile-first approach
- **Prisma** - Type-safe ORM for database access
- **PostgreSQL** - Relational database
- **NextAuth v5 (Auth.js)** - Authentication solution

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── auth/[...nextauth]/   # NextAuth API routes
│   ├── auth/
│   │   └── signin/               # Sign-in page
│   ├── dashboard/                # Protected dashboard page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/
│   └── prisma.ts                 # Prisma client singleton
├── prisma/
│   └── schema.prisma             # Database schema
├── auth.ts                       # NextAuth configuration
├── middleware.ts                 # Auth middleware
└── prisma.config.ts              # Prisma configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your app URL (default: http://localhost:3000)

3. Set up the database:

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init
```

4. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your application.

## Database Schema

The application includes the following models:

- **User** - User accounts
- **Account** - OAuth account connections
- **Session** - User sessions
- **VerificationToken** - Email verification tokens

## Authentication

NextAuth v5 is configured with the Prisma adapter. To add authentication providers:

1. Install the provider package
2. Add provider credentials to `.env`
3. Configure the provider in `auth.ts`

Example providers:
- Google OAuth
- GitHub OAuth
- Credentials (email/password)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Open Prisma Studio
npx prisma studio
```

## Mobile-First Design

All components are built with a mobile-first approach using Tailwind CSS:

- Base styles target mobile devices
- `sm:` breakpoint for tablets (640px+)
- `lg:` breakpoint for desktops (1024px+)

## Next Steps

1. Configure your PostgreSQL database connection in `.env`
2. Add authentication providers in `auth.ts`
3. Create your database schema in `prisma/schema.prisma`
4. Run migrations: `npx prisma migrate dev`
5. Start building your application features

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Documentation](https://authjs.dev)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
