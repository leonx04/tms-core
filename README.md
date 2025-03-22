# TMC - Task Management Core

TMC is a comprehensive task management system designed for software development teams to track bugs, develop features, and manage documentation with ease.

## Introduction

TMC was born out of my personal experience as a developer facing the challenges of project management. I created this platform to simplify task management for software development teams, believing that great software is built when developers can focus on what matters most: writing code and solving problems, not managing their workflow.

This platform is designed to seamlessly integrate with the tools developers already use, providing a centralized hub to track tasks, bugs, and documentation throughout the development lifecycle.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

The project has the following structure:

```
.env.local
.gitignore
check-missing-env.js
components.json
google32ff2d73c7b9541a.html
middleware.ts
next-env.d.ts
next.config.ts
package.json
postcss.config.mjs
README.md
tailwind.config.js
task-core-firebase-adminsdk-fbsvc-f2ac20b916.json
tsconfig.json
.next/
    app-build-manifest.json
    build-manifest.json
    fallback-build-manifest.json
    package.json
    react-loadable-manifest.json
    trace
    cache/
    server/
    static/
    types/
src/
```

## Route Performance

Below is an overview of the route sizes and their first-load JavaScript (`JS`) sizes:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    82.1 kB         303 kB
├ ○ /_not-found                          189 B           106 kB
├ ○ /about                               192 B           115 kB
├ ƒ /api/auth/forgot-password            189 B           106 kB
├ ƒ /api/create-checkout-session         189 B           106 kB
├ ƒ /api/import-tasks                    189 B           106 kB
├ ƒ /api/manage-subscription             189 B           106 kB
├ ƒ /api/notifications                   189 B           106 kB
├ ƒ /api/upload                          189 B           106 kB
├ ƒ /api/webhooks/cloudinary             189 B           106 kB
├ ƒ /api/webhooks/github                 189 B           106 kB
├ ƒ /api/webhooks/stripe                 189 B           106 kB
├ ○ /blog                                192 B           115 kB
├ ○ /careers                             3.33 kB         128 kB
├ ○ /changelog                           189 B           106 kB
├ ○ /contact                             6.69 kB         133 kB
├ ○ /cookies                             187 B           110 kB
├ ○ /forgot-password                     3.67 kB         219 kB
├ ○ /login                               4.42 kB         248 kB
├ ○ /privacy                             187 B           110 kB
├ ○ /profile                             12 kB           236 kB
├ ○ /projects                            7.45 kB         245 kB
├ ƒ /projects/[id]                       115 kB          359 kB
├ ƒ /projects/[id]/members               5.35 kB         226 kB
├ ƒ /projects/[id]/settings              8.51 kB         232 kB
├ ƒ /projects/[id]/tasks/[taskId]        10.5 kB         258 kB
├ ƒ /projects/[id]/tasks/[taskId]/edit   10.7 kB         282 kB
├ ƒ /projects/[id]/tasks/create          4.01 kB         276 kB
├ ○ /projects/create                     2.23 kB         246 kB
├ ○ /register                            4.4 kB          248 kB
├ ○ /reset-password                      4.95 kB         220 kB
├ ○ /roadmap                             3.33 kB         123 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /sitemap.xml                         0 B                0 B
├ ○ /subscription-history                4.28 kB         225 kB
├ ○ /terms                               187 B           110 kB
└ ○ /upgrade                             9.31 kB         233 kB
+ First Load JS shared by all            106 kB
  ├ chunks/1517-7aa13cf55716ab6d.js      50.7 kB
  ├ chunks/4bd1b696-e4bfafa2c9892ca2.js  53 kB
  └ other shared chunks (total)          2.01 kB
```

## Environment Variables

The project requires the following environment variables, which should be defined in the `.env.local` file:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_firebase_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
EMAIL_FROM=noreply@TMC.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ROUTE_SECRET=your_route_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_DATABASE_URL=your_firebase_database_url
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_GOOGLE_ANALYTICS=your_google_analytics_id
JWT_SECRET=your_jwt_secret
```

