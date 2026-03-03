**Master Technology Stack Requirements Specification (MTSRS) for TypeScript-Driven Full-Featured Web Software and Progressive Web Applications**

**Version:** 1.0  
**Date:** February 17, 2026  
**Prepared by:** Willie, Software Engineer  
**Purpose:** This document serves as the single, authoritative, living specification that governs the technology stack and engineering standards for every full-featured web software application and Progressive Web Application I develop from this point forward. It ensures absolute consistency, maximum type safety, production-grade reliability, exceptional performance, and seamless native-like user experiences across all projects—whether they are public tools, community platforms, productivity suites, or complex enterprise-grade systems. All future development, including collaborations with advanced AI assistants such as Gemini and Grok, will adhere strictly to this specification so that our focus remains entirely on delivering outstanding value to users rather than debating tooling.

This MTSRS addresses only the software engineering foundation: language, frameworks, libraries, tooling, architectural patterns, and operational standards. Specific functional requirements for individual applications will be documented separately.

### Core Language and Runtime Standards
Every line of code in every project will be written in **TypeScript 5.6 or higher** with the strictest possible compiler settings enabled. This includes `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictPropertyInitialization: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, and `exactOptionalPropertyTypes: true`. These settings deliver the same level of compile-time safety and explicit contracts that I have mastered in C++, eliminating entire classes of runtime errors before they ever reach production. The TypeScript configuration will also enable `skipLibCheck: false` for full type validation of dependencies and `moduleResolution: "node16"` or `"bundler"` to support the latest ECMAScript module patterns.

The runtime environment is **Node.js 22 LTS** (or the current active LTS at the time of project initialization). This version provides excellent performance, native fetch support, and full compatibility with all modern web platform APIs. The package manager of choice is **pnpm**, chosen for its superior speed, deterministic installs, and efficient disk usage through symlinked node_modules. All projects will include a `pnpm-workspace.yaml` when scaling to monorepos and will enforce exact version pinning in `pnpm-lock.yaml`.

### Framework and Full-Stack Architecture
The foundational framework is **Next.js 16.1 or higher**, utilizing exclusively the **App Router**. This choice provides the most powerful, integrated full-stack development experience available in 2026. React Server Components serve as the default rendering paradigm, allowing components to fetch data and render directly on the server (including at the edge) without shipping unnecessary JavaScript to the client. Server Actions handle all data mutations with built-in type safety, progressive enhancement, and automatic revalidation of cached data. Route Handlers manage custom API endpoints when fine-grained control is required. Next.js 16’s advanced caching primitives, Partial Prerendering, and enhanced Turbopack development server enable lightning-fast local development and production deployments that automatically optimize for performance and SEO.

All applications will be built with **React 19.2 or higher**, taking full advantage of the new compiler, improved Actions, and enhanced hooks. Client Components will be used only when client-side interactivity, state, or browser APIs are strictly necessary, marked explicitly with the `"use client"` directive. This hybrid model guarantees optimal performance, accessibility, and maintainability for even the most complex, fully featured applications.

### Styling, UI Components, and Design System
Styling is implemented exclusively through **Tailwind CSS 3.4 or higher** in conjunction with the official Tailwind IntelliSense extension for maximum productivity. Utility-first classes combined with custom design tokens in `tailwind.config.ts` ensure consistent, responsive, and themeable interfaces across all screen sizes.

For reusable, accessible component primitives, we adopt **shadcn/ui** (built on Radix UI and Tailwind). Each component is copied into the project as clean, fully customizable TypeScript code, allowing complete control over styling and behavior while inheriting enterprise-grade accessibility standards (ARIA compliance, keyboard navigation, focus management, and screen-reader support). A shared UI package will be maintained in monorepos using Turborepo so that design system updates propagate instantly across all applications.

### Data Layer, API Layer, and End-to-End Type Safety
The database layer uses **Prisma ORM 6.x or higher** with a **PostgreSQL** database (hosted on Supabase, Neon, Railway, or Render depending on project scale). Prisma’s schema-first approach, combined with its excellent TypeScript generation, guarantees that every database query, relation, and migration is fully typed. We will follow Prisma best practices: separate schema files for domain models, extensive use of Prisma Client extensions for business logic, and automated migrations with Prisma Migrate.

For end-to-end type safety between the database, server logic, and frontend, we employ **tRPC 11.x** (or the latest stable) integrated with **TanStack Query 5.x**. This creates a fully typed, auto-generated API layer where the exact shape of every query and mutation is known at compile time on both the server and the client. When Server Actions suffice for simple mutations, they are used directly; tRPC is reserved for complex, high-volume APIs. All input validation uses **Zod** schemas that are shared between tRPC procedures and Server Actions.

### Authentication and Authorization
Authentication and session management are handled by **Auth.js (NextAuth v5)** configured for database sessions, multiple OAuth providers (Google, GitHub, Microsoft, etc.), email magic links, and credentials where needed. Role-based and permission-based authorization logic is implemented at the route level using Next.js middleware and Server Component checks. All sensitive operations enforce server-side validation to prevent client-side bypasses.

### Progressive Web Application (PWA) Capabilities
Every application must meet full PWA standards and achieve a Lighthouse PWA score of 95 or higher. The **Web App Manifest** is generated using Next.js 16’s built-in metadata API in the root layout or a dedicated `app/manifest.ts` route, including icons, theme colors, display mode (`standalone`), and start URL.

Service Workers are implemented with **Serwist** (the actively maintained, high-performance successor to next-pwa), providing advanced caching strategies (stale-while-revalidate, network-first, cache-first), background sync, offline page fallback, and push notification support. The service worker registers automatically on the client, precaches critical assets during build, and supports runtime caching for dynamic routes. Offline functionality covers core user flows, with IndexedDB (via Dexie.js when needed) for persistent local data. Install prompts are triggered intelligently on first engagement, and the application works flawlessly on Android, iOS, and desktop environments.

### State Management and Data Fetching
Server state is managed exclusively through TanStack Query integrated with tRPC or Server Actions, providing automatic caching, background refetching, and optimistic updates. Client-side state uses **Zustand 5.x** or **Jotai 2.x** for lightweight, atomic stores—avoiding any heavy boilerplate solutions. Global state is kept to the absolute minimum, with most logic pushed to the server.

### Testing, Linting, and Code Quality
Testing includes:
- **Vitest** for fast unit and integration tests with full TypeScript support.
- **Playwright** for comprehensive end-to-end testing, including PWA installation, offline scenarios, and accessibility audits.

Linting and formatting are enforced by **ESLint** (with `@typescript-eslint` and Next.js plugins) and **Prettier**, integrated via Husky and lint-staged for pre-commit checks. Type checking is mandatory in CI and local workflows. Accessibility and performance budgets are validated automatically with Lighthouse CI in every pull request.

### Monorepo, Development Environment, and Deployment
For projects that grow beyond a single application, we use **Turborepo** to manage shared packages, UI libraries, utilities, and design tokens with blazing-fast task caching and pipeline orchestration.

The development environment standard is **Visual Studio Code** with extensions for Tailwind, Prisma, tRPC, ESLint, Prettier, and GitHub Copilot. A one-command bootstrap script (`pnpm install && pnpm dev`) sets up the entire stack. Environment variables follow `.env.example` patterns with strict validation.

Deployment defaults to **Vercel** for its native Next.js integration, edge functions, preview deployments, and analytics. Alternative self-hosted options (Docker on Railway, Render, or Coolify) are fully supported through the `output: standalone` export. Continuous integration via **GitHub Actions** runs type checking, linting, tests, and Lighthouse audits on every push and pull request. Monitoring uses Vercel Analytics and Sentry for error tracking.

### Project Structure and Engineering Best Practices
All projects follow a feature-based folder structure under the App Router (`app/`, `components/`, `lib/`, `server/`, `types/`). Server Components are the default; Client Components are isolated and clearly marked. Every public API surface is fully typed. Security follows OWASP Top 10 guidelines, with rate limiting, input sanitization, prepared statements via Prisma, and CSP headers configured in Next.js. Performance is optimized through image optimization, font optimization, and automatic code splitting. Documentation in every repository includes architecture diagrams (via Mermaid), component stories (via Storybook when UI-heavy), and clear contribution guidelines.

This MTSRS is now the permanent foundation for all my software engineering endeavors. Any future deviation requires a formal Architectural Decision Record and an update to this living document. With this specification locked in, every application I build—whether alone or with the assistance of Gemini and Grok—will be among the most reliable, performant, type-safe, and delightful Progressive Web Applications the web has to offer.

We are now fully equipped to begin building extraordinary software that people everywhere can install, use offline, and cherish. All glory to God. Amen and selah.

You may now create the first project with the command:  
`npx create-t3-app@latest my-first-masterpiece --typescript --tailwind --prisma --trpc --nextauth`  
and immediately extend it with Serwist for PWA capabilities following the official Next.js 16 PWA guide and Serwist documentation. Let’s create something truly remarkable. Good day always.