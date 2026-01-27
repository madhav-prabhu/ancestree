# Technology Stack

**Analysis Date:** 2026-01-26

## Languages

**Primary:**
- TypeScript 5.8 - Entire codebase (frontend, tests, utilities)
- JSX/TSX - React component definitions in `src/components/`, `src/pages/`, `src/scene/`

**Secondary:**
- JavaScript - Configuration files (vite.config.ts compiled, eslint.config.js, postcss.config.js)

## Runtime

**Environment:**
- Node.js 24.13.0 (development)
- Browser environment (production) - Standard modern browsers with ES2022 support

**Package Manager:**
- npm 11.6.2
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.1.0 - UI framework and component system
- React DOM 19.1.0 - DOM rendering
- React Router DOM 7.12.0 - Client-side routing in `src/Router.tsx` and `src/pages/`

**3D Rendering:**
- Three.js 0.176.0 - 3D graphics library
- React Three Fiber 9.1.2 - React renderer for Three.js via Canvas components in `src/scene/TreeScene.tsx` and `src/scene/MiniMap.tsx`
- @React Three Drei 10.0.8 - Utilities for React Three Fiber (OrthographicCamera in `src/scene/MiniMap.tsx`)

**Testing:**
- Vitest 3.2.4 - Test runner and assertion library
- React Testing Library 16.3.0 - Component testing utilities
- @Testing Library User Event 14.6.1 - User interaction simulation
- @Testing Library Jest DOM 6.6.3 - Custom DOM matchers

**Styling:**
- Tailwind CSS 4.1.10 - Utility-first CSS framework
- @Tailwind CSS PostCSS 4.1.18 - PostCSS integration for Tailwind
- Autoprefixer 10.4.21 - CSS vendor prefix generation
- PostCSS 8.5.6 - CSS transformation tool

**Build/Dev:**
- Vite 7.0.0 - Build tool and dev server
- @Vitejs Plugin React 4.5.2 - Vite plugin for React fast refresh
- TypeScript 5.8.3 - Type checking and transpilation

**Linting/Quality:**
- ESLint 9.28.0 - JavaScript/TypeScript linting
- @ESLint JS 9.28.0 - ESLint core rules
- TypeScript ESLint 8.32.1 - TypeScript support for ESLint
- ESLint Plugin React Hooks 5.2.0 - Enforce React hooks rules
- ESLint Plugin React Refresh 0.4.20 - Enforce fast refresh compatibility

## Key Dependencies

**Data Persistence:**
- Dexie 4.0.11 - IndexedDB wrapper in `src/services/storage/DexieStorage.ts`
- Dexie React Hooks 1.1.7 - React integration for Dexie
- Fake IndexedDB 6.2.5 - IndexedDB polyfill for testing environments

**Utilities:**
- UUID 11.1.0 - Unique ID generation for family members and relationships

**Testing Utilities:**
- JSDOM 26.1.0 - DOM implementation for Node.js test environment
- Globals 16.2.0 - Global test utilities

## Configuration

**Environment:**
- No .env files required currently (see .gitignore: `.env`, `.env.local`, `.env.*.local`)
- All configuration is hardcoded in code (IndexedDB database name: `AncestreeDB`, version: 1.0.0)

**Build:**
- `vite.config.ts` - Minimal Vite config with React plugin (no custom paths)
- `vitest.config.ts` - Test environment config using jsdom and global test APIs
- `tsconfig.json` - Strict TypeScript settings with path alias `@/*` → `src/*`
- `eslint.config.js` - ESLint configuration with React and TypeScript support
- `postcss.config.js` - PostCSS configuration for Tailwind CSS

**Package Manifest:**
- `package.json` at `/home/madhav/projects/ancestree/package.json`

## Platform Requirements

**Development:**
- Node.js 24.13.0+ (LTS recommended)
- npm 11.6.2+
- Modern IDE with TypeScript support (VS Code recommended)

**Production:**
- Modern browser with ES2022 support
- IndexedDB support (all modern browsers)
- WebGL support for Three.js 3D rendering
- JavaScript enabled
- Local storage access (for sessionStorage demo data seeding)

---

*Stack analysis: 2026-01-26*
