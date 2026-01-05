# JuryApp

**JuryApp** is a modern, comprehensive web application designed to streamline the management of hackathons and competitions. It provides a seamless experience for participants to register and submit their work, while offering a robust interface for juries to evaluate and rate presentations efficiently.

> Currently configured for the **Heroes Of The Brain 2025** - one of the largest stationary neurotechnology hackathon in Europe.

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

## Screenshots
![telegram-cloud-photo-size-4-5944844193983302928-y](https://github.com/user-attachments/assets/37384efa-37cd-49f6-ba67-e951b98691fe)


### Admin Dashboard
<img width="1340" height="751" alt="image" src="https://github.com/user-attachments/assets/608333df-03b3-4588-b151-aed807d95802" />

### Rating
<img width="1909" height="930" alt="image" src="https://github.com/user-attachments/assets/da9979c4-212c-4c59-b8ca-10e7ff33b0b2" />
<img width="1907" height="928" alt="image" src="https://github.com/user-attachments/assets/ec5df501-125e-4e63-8a61-d1f941068ce6" />

### Ranking
<img width="1912" height="931" alt="image" src="https://github.com/user-attachments/assets/eec587a9-4b08-4c8d-8b26-918a44b27997" />


### Project submission
<img width="1455" height="786" alt="image" src="https://github.com/user-attachments/assets/ddd498c4-9fdc-4e95-9d82-a06e584bc174" />

<img width="1467" height="804" alt="image" src="https://github.com/user-attachments/assets/9b1995e8-8bab-4745-9039-818d22ca0acd" />



## 📄 License

[MIT](LICENSE)
