# JuryApp

**JuryApp** is a modern, comprehensive web application designed to streamline the management of hackathons and competitions. It provides a seamless experience for participants to register and submit their work, while offering a robust interface for juries to evaluate and rate presentations efficiently.

> Currently configured for the **Heroes Of The Brain 2025** event.

## 🚀 Key Features

*   **Dynamic Event Configuration:** Easily customizable event details, categories, schedule, and rating criteria via a centralized `app_config.yaml` file.
*   **Team Management:**
    *   Team registration and profile management.
    *   File uploads (e.g., PDF presentations).
    *   Submission status tracking.
*   **Jury System:**
    *   Dedicated jury accounts and login.
    *   Intuitive rating interface with configurable criteria (e.g., Innovation, Usefulness).
    *   Real-time progress tracking and rating confirmation workflow.
*   **Real-time Ranking:** Automatic calculation of team rankings based on jury scores.
*   **Admin Dashboard:** Overview of system status and event metrics.
*   **Internationalization (i18n):** Multi-language support (English, Polish) using Paraglide.
*   **Responsive Design:** optimized for desktop and mobile devices.

## 🛠️ Tech Stack

*   **Framework:** [SvelteKit](https://kit.svelte.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/)
*   **Backend & Auth:** [PocketBase](https://pocketbase.io/)
*   **Internationalization:** [Paraglide JS](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
*   **Testing:** [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/)

## ⚙️ Configuration (`app_config.yaml`)

The core logic of the event is controlled by `app_config.yaml`. This allows you to repurpose the application for different events without changing the code.

```yaml
event:
  name: "Event Name"
  year: "2025"
  # ...
  categories:
    - key: "wellness"
      name: "Wellness"
      color: "#36c399"
  rating_criteria:
    - key: "innovation"
      name: "Innovation"
      maxScore: 5
```

Key sections:
-   **`event`**: Basic info (name, organizer, deadlines).
-   **`categories`**: Define competition tracks/categories.
-   **`rating_criteria`**: Customize the scoring metrics and weights.
-   **`schedule`**: Define the event timeline displayed to users.
-   **`links`**: Add useful external links (Discord, Wiki, etc.).

## 📦 Installation & Setup

### Prerequisites

*   Node.js (v18+ recommended) or Bun
*   A running [PocketBase](https://pocketbase.io/) instance.

### Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd JuryApp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory (use `.env.example` as a template) and configure your PocketBase URL.

    ```env
    PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
    ```

4.  **Start the Development Server:**
    ```bash
    npm run dev
    ```

5.  **Open the App:**
    Navigate to `http://localhost:5173` in your browser.

## 📜 Scripts

*   `npm run dev`: Start the development server.
*   `npm run build`: Build the application for production.
*   `npm run preview`: Preview the production build locally.
*   `npm run check`: Run SvelteKit sync and TypeScript check.
*   `npm run lint`: Run ESLint and Prettier checks.
*   `npm run format`: Format code with Prettier.
*   `npm run test`: Run unit tests with Vitest.

## 📄 License

[MIT](LICENSE)
