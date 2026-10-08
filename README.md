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
*   **Responsive Design:** optimized for desktop and mobile devices.

## 🛠️ Tech Stack

*   **Framework:** [SvelteKit](https://kit.svelte.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/)
*   **Backend & Auth:** [PocketBase](https://pocketbase.io/)
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
-   **`submission.required`**: Items a team must provide for a complete submission (`presentation`, `repo`, `video`); a category can override it.
-   **`categories`**: Competition tracks; each one can override `rating_criteria` and `submission.required`, and is rated and published separately.
-   **`rating_criteria`**: Customize the scoring metrics and weights.
-   **`schedule`**: Define the event timeline displayed to users.
-   **`links`**: Add useful external links (Discord, Wiki, etc.).

## 📦 Installation & Setup

### Prerequisites

*   Node.js (v18+ recommended) and npm (the repository's only lockfile is `package-lock.json`)
*   A running [PocketBase](https://pocketbase.io/) instance.

### PocketBase setup

Participants and jurors can log in to PocketBase directly with their own credentials, so its API rules matter: the app checks access itself and reads everything sensitive through the superuser account (`POCKETBASE_ADMIN_EMAIL` / `POCKETBASE_ADMIN_PASSWORD`).

**How it works**
- Every category (`app_config.yaml`) is rated by its own jurors, with its own criteria and required submission items.
- Organizers assign jurors to categories and move teams between categories in the Admin Dashboard.
- Judging follows the Heroes of the Brain rules (§8): in the **preliminary round** jurors rate every team from its PDF and demo video (implementation 1–10, innovation 1–5, usefulness 1–5); organizers then start the **final** with at most `finalists_per_category` teams, whose stage presentation is rated too (1–5, 25 points in total). A tie for first place is decided by a jury vote that the organizers record in the Admin Dashboard, and every category has a printable jury protocol for signatures.
- Teams check in by uploading anything before `checkin_deadline`; the Admin Dashboard shows who did.
- Results stay hidden until an organizer publishes a category. Publishing requires every juror of the category to rate all of its teams and confirm; changing a rating withdraws the confirmation, and ratings are locked once the category is published. Jurors see their category's ranking once all of its jurors confirmed.
- Teams submit the PDF, the repository link and the video link separately; every save stores only what changed and the app shows the newest version of each item.

**Collections** (empty rule = superuser only)

| Collection      | Fields                                                                                                                  | List / View rule                                                                           | Create / Update / Delete             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `users` (auth)  | `name`, `role` (text: participant / jury / admin), `team` (relation → `teams`), `jury_categories` (json), `confirmed_categories` (json) | `id = @request.auth.id \|\| @request.auth.role = "admin"`                                     | empty (organizers manage accounts)   |
| `teams`         | `name` (text), `category` (text, a category key)                                                                        | `@request.auth.id != ""`                                                                   | empty                                |
| `presentations` | `team` (relation → `teams`, required), `presentation` (file, PDF, **optional**), `repo_link`, `video_link` (text), `submitted_by` (relation → `users`) | `team = @request.auth.team \|\| @request.auth.role = "admin"`                                 | empty                                |
| `ratings`       | `jury` (relation → `users`), `team` (relation → `teams`), `scores` (json), `finalGrade` (number), `comments` (text)  | `@request.auth.role = "admin" \|\| (@request.auth.role = "jury" && jury = @request.auth.id)`   | Create/Update: `(@request.auth.role = "jury" \|\| @request.auth.role = "admin") && jury = @request.auth.id`; Delete: `@request.auth.role = "admin"` |
| `event_state`   | `published_categories`, `published_at`, `stages`, `finalists`, `tie_winners` (all json)                                                                    | empty                                                                                      | empty                                |
| `jury_notes`    | `jury` (relation → `users`), `team` (relation → `teams`), `content` (text)                                             | empty                                                                                      | empty                                |

Users must not be able to update their own record: they could change their role, team or jury categories.

The `comments` field of a rating is the feedback for the team: the team sees it (without jury names) after its category is published.

### Running it for the event

The app keeps short-lived caches in memory and works as a single Node process. In a load test with 300 simultaneous sessions it answered 95% of requests within 0.45 s; only hundreds of clicks in the same millisecond take a few seconds. For more headroom run several processes behind a load balancer (each has its own cache, data may then be up to 2 s old).

### Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd JuryApp
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory (use `.env.example` as a template) and configure your PocketBase URL.

    ```env
    POCKETBASE_URL=http://127.0.0.1:8090
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
