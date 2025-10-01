# JuryApp - Heroes of the Brain 2025

A comprehensive jury/judging application for hackathon events, specifically designed for "Heroes of the Brain 2025". This application enables jury members to evaluate team presentations, upload and review PDFs, and track rankings in real-time.

## Features

- **Authentication System**: Secure login/register functionality with PocketBase backend
- **Team Rating**: Evaluate teams across multiple criteria:
  - Innovation
  - Usefulness
  - Final Presentation
  - Implementation
- **PDF Workspace**: Upload, preview, and work with presentation materials
- **Real-time Rankings**: View team standings based on jury evaluations
- **Internationalization (i18n)**: Multi-language support (English & Polish) using Paraglide
- **Responsive Design**: Mobile-first UI with DaisyUI and Tailwind CSS
- **Role-based Access**: Different views for jury members and administrators

## Tech Stack

### Frontend
- **[SvelteKit](https://kit.svelte.dev/)** - Full-stack framework with Svelte 5
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[DaisyUI](https://daisyui.com/)** - Tailwind CSS component library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

### Backend & Data
- **[PocketBase](https://pocketbase.io/)** - Open-source backend (SQLite + realtime)
- **Authentication** - Built-in auth with user roles

### Internationalization
- **[Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)** - Type-safe i18n library
- **Supported Languages**: English (en), Polish (pl)

### PDF Handling
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - PDF rendering and manipulation

### Testing
- **[Vitest](https://vitest.dev/)** - Unit and integration testing
- **[Playwright](https://playwright.dev/)** - Browser testing
- **vitest-browser-svelte** - Svelte component testing

## Prerequisites

Before you begin, ensure you have installed:

- **Node.js** (v18 or higher)
- **npm**, **pnpm**, or **yarn** package manager
- **PocketBase** server running (for backend functionality)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KN-Neuron/JuryApp.git
   cd JuryApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

3. **Set up PocketBase**
   - Download PocketBase from [https://pocketbase.io/](https://pocketbase.io/)
   - Start PocketBase server (default: `http://127.0.0.1:8090`)
   - Configure collections for users, teams, and ratings
   - Update the PocketBase URL in `src/lib/pocketbase.svelte.ts` if needed

4. **Configure environment variables**
   ```bash
   # Create .env file (if needed for custom configuration)
   cp .env.example .env
   ```

## Development

Start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The application will be available at `http://localhost:5173` (default Vite port).

### Development Commands

```bash
# Start dev server
npm run dev

# Type checking
npm run check

# Watch mode for type checking
npm run check:watch

# Format code
npm run format

# Lint code
npm run lint

# Run tests
npm run test

# Run tests in watch mode
npm run test:unit
```

## Building

To create a production version of your app:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Project Structure

```
JuryApp/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable Svelte components
│   │   │   ├── Login.svelte
│   │   │   ├── Register.svelte
│   │   │   ├── TeamCard.svelte
│   │   │   ├── TeamRanking.svelte
│   │   │   ├── GradeTeamForm.svelte
│   │   │   ├── UploadFile.svelte
│   │   │   └── pdf/             # PDF-related components
│   │   ├── paraglide/           # Generated i18n files (auto-generated)
│   │   ├── server/              # Server-side utilities
│   │   ├── utils/               # Utility functions
│   │   ├── interfaces/          # TypeScript interfaces
│   │   ├── pocketbase.svelte.ts # PocketBase client setup
│   │   └── types.ts             # Type definitions
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout with sidebar
│   │   ├── +page.svelte         # Landing page
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── rate_presentation/   # Team rating interface
│   │   ├── ranking/             # Rankings display
│   │   └── upload/              # PDF upload workspace
│   ├── app.css                  # Global styles
│   ├── app.html                 # HTML template
│   └── hooks.server.ts          # Server hooks (i18n middleware)
├── messages/                    # i18n translation files
│   ├── en.json
│   └── pl.json
├── project.inlang/              # Inlang i18n configuration
├── static/                      # Static assets
├── svelte.config.js            # SvelteKit configuration
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration (if present)
└── package.json
```

## Configuration

### PocketBase

The application connects to PocketBase at the URL configured in `src/lib/pocketbase.svelte.ts`:

```typescript
const pb = new PocketBase('https://frog01-32147.wykr.es/')
```

**Security Note**: Update this URL to use environment variables in production:

```typescript
const pb = new PocketBase(env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090')
```

### Internationalization

Add or modify translations in the `messages/` directory:
- `messages/en.json` - English translations
- `messages/pl.json` - Polish translations

The i18n configuration is in `project.inlang/settings.json`.

### Styling

- Global styles: `src/app.css`
- Tailwind configuration: Uses Tailwind CSS v4 with the Vite plugin
- DaisyUI themes and components are available throughout the app

## Testing

The project uses Vitest for testing with separate configurations for client and server tests:

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:unit
```

### Test Structure

- **Client tests**: `src/**/*.svelte.{test,spec}.{js,ts}` - Run in browser environment
- **Server tests**: `src/**/*.{test,spec}.{js,ts}` - Run in Node.js environment
- Example test: `src/routes/page.svelte.test.ts`

## Deployment

The project uses `@sveltejs/adapter-auto` which automatically selects the appropriate adapter for your deployment platform.

### Supported Platforms

- Vercel
- Netlify
- Cloudflare Pages
- Node.js servers
- Static hosting (with adapter-static)

For specific deployment targets, you may need to install a specific adapter:

```bash
npm install -D @sveltejs/adapter-node
# or
npm install -D @sveltejs/adapter-static
# or
npm install -D @sveltejs/adapter-vercel
```

Then update `svelte.config.js` to use the appropriate adapter.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use Prettier for formatting: `npm run format`
- Follow ESLint rules: `npm run lint`
- Write tests for new features

## License

This project is part of the "Heroes of the Brain 2025" hackathon organized by KN-Neuron.

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/KN-Neuron/JuryApp/issues).
