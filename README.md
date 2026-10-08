# Hackathonownik

**Hackathonownik** (formerly JuryApp) runs a whole hackathon after the coding: teams submit their projects, jurors rate them in two rounds, organizers run the stage and publish the results. It is built for **Heroes Of The Brain 2026** (14–15 Nov, Wrocław University of Science and Technology; 5 categories, ~62 teams, ~250 people) and follows its [rules](https://heroesofthebrain.pwr.edu.pl/regulamin), but everything event-specific lives in `app_config.yaml`.

## 🚀 What it does

### Participants
- **Simple submit page**: three cards (presentation PDF, repository link, demo video link), each saved on its own, with a progress bar. The PDF uploads as soon as it's chosen; any file name works and links without `https://` are accepted.
- **Teammates share one submission**: everyone in the team can add different parts; the newest version of every item is what the jury sees. *My Submission* shows who added what and when, and the full change history.
- **Check-in**: teams upload anything before `checkin_deadline`, so organizers know how many teams really compete.
- **Final presentation**: a separate PDF for the stage, with its own, later deadline.
- **Results**: after a category is published teams see their place, the final ranking and the jury's feedback (anonymous), plus how to appeal.
- A deadline countdown, team members list and a link to the organizers.

### Jury
- **Rating by category**: a juror sees, rates and takes notes on only the categories assigned to them, switching between them with tabs.
- **Two rounds** (rules §8): the preliminary round is rated from the PDF and demo video, the final only for the finalists, including the stage presentation. Scores are whole numbers from 1 up to each criterion's maximum, 25 points in total.
- **Presentation order** set by the organizers, numbered, with a **search** by team name or number ("7").
- **"Now on stage"**: when the organizers put a team on stage, jurors see it live with the remaining time, and can switch on *Follow the stage* to show only the presenting team.
- **Private notes** per team (autosaved, visible only to the juror) and **feedback for the team** (shown to the team after publishing).
- A progress counter, filters (all / not rated / rated), a confirmation step ("my ratings are final"; changing a rating withdraws it) and a record of which materials the juror opened.
- Embedded YouTube/Loom player for the demo video.

### Organizers (Admin Dashboard)
- **Per-category control**: progress of every juror, the submission table (what's missing, check-in, team size 3–4), the live ranking.
- **Judging workflow**: pick the finalists (top 5 preselected, with a warning when a tie crosses the cut-off), start the final, record the jury vote that breaks a tie for first place, then publish the category. Publishing is blocked until every juror rated everything and confirmed (an explicit override exists).
- **Presentation order** (move up/down, random draw, A–Z) and a **presenter mode** (`/present`): the team's slides full screen with a countdown timer in the corner, previous/next team, keyboard shortcuts.
- **Jury review**: which juror opened which presentation, video, repository or final presentation, and whether they already rated the team.
- **People**: add a juror (a password is generated and shown once), reset a password, assign jurors to categories, move a team to another category.
- **Import teams and participants from a CSV** (`/admin/import`): columns `name`, `email`, `team`, `category` (Excel exports with Polish headers and `;` work). The file is checked first (bad e-mails, unknown categories, a team in two categories, duplicates, team sizes), then teams and accounts are created and a CSV with the generated passwords can be downloaded once.
- **Printable jury protocol** per category (ranking, every juror's scores, signature lines).
- Info page with the schedule and useful links.

### Rankings and privacy
- Rankings are **per category** (criteria differ), by the average of the jurors' scores; ties share a place.
- **Nothing leaks early**: results are hidden until an organizer publishes the category; jurors see their category's ranking only once all of its jurors confirmed; participants never see juror names; the jury sees only its own categories.
- Roles: participant, jury, admin. Access is checked by the app and enforced again in PocketBase (see the rules below).

### Under the hood
- English-only UI, responsive layout.
- Handles ~300 simultaneous users (load-tested on the production build); short in-memory caches for the hot pages.

## 🛠️ Tech Stack

*   **Framework:** [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [DaisyUI](https://daisyui.com/)
*   **Backend & Auth:** [PocketBase](https://pocketbase.io/)
*   **Testing:** [Vitest](https://vitest.dev/)

## ⚙️ Configuration (`app_config.yaml`)

The core logic of the event is controlled by `app_config.yaml`. This allows you to repurpose the application for different events without changing the code.

```yaml
event:
  name: "Heroes Of The Brain"
  year: "2026"
  deadline: "2026-11-15T12:00:00+01:00"            # always with a UTC offset
  checkin_deadline: "2026-11-14T23:59:00+01:00"      # optional
  final_presentation_deadline: "2026-11-15T14:00:00+01:00"
  stage_presentation_minutes: 5
  finalists_per_category: 5
  submission:
    required: [presentation, repo, video]            # default for every category
  categories:
    - key: "fnirs"
      name: "Breath, Brain and Body (fNIRS)"
      color: "#f7a654"
      submission: { required: [presentation, repo] } # overrides the default
      # rating_criteria: [...]                       # optionally its own criteria
  rating_criteria:                                   # default for every category
    - { key: "implementation", name: "Implementation quality", maxScore: 10, stage: "preliminary" }
    - { key: "finalPresentation", name: "Final presentation", maxScore: 5, stage: "final" }
```

Key sections:
-   **`event`**: name, year, organizer and the deadlines (submission, check-in, final presentation).
-   **`categories`**: competition tracks; each can override `rating_criteria` and `submission.required`, and is rated and published separately. A category key is stored in `teams.category` and in a juror's `jury_categories`.
-   **`rating_criteria`**: scoring criteria. `stage: "final"` criteria are rated only in the final.
-   **`submission.required`**: items a team must provide for a complete submission (`presentation`, `repo`, `video`).
-   **`finalists_per_category`**, **`stage_presentation_minutes`**: judging and presenter-mode settings.
-   **`schedule`** and **`links`**: shown on the info page.

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
- Teams upload a preliminary presentation, a repository link, a demo video and – for the final – a separate final presentation (until `final_presentation_deadline`).
- **Presenter mode** (`/present`, admins): each team's slides full screen with a `stage_presentation_minutes` timer; the team on stage shows up live for its jurors ("Now on stage", with an option to follow it). The Admin Dashboard shows which juror opened which presentation, video and repository link.
- Results stay hidden until an organizer publishes a category. Publishing requires every juror of the category to rate all of its teams and confirm; changing a rating withdraws the confirmation, and ratings are locked once the category is published. Jurors see their category's ranking once all of its jurors confirmed.
- Teams submit the PDF, the repository link and the video link separately; every save stores only what changed and the app shows the newest version of each item.

**Collections** (empty rule = superuser only)

| Collection      | Fields                                                                                                                  | List / View rule                                                                           | Create / Update / Delete             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| `users` (auth)  | `name`, `role` (text: participant / jury / admin), `team` (relation → `teams`), `jury_categories` (json), `confirmed_categories` (json) | `id = @request.auth.id \|\| @request.auth.role = "admin"`                                     | empty (organizers manage accounts)   |
| `teams`         | `name` (text), `category` (text, a category key)                                                                        | `@request.auth.id != ""`                                                                   | empty                                |
| `presentations` | `team` (relation → `teams`, required), `presentation` (file, PDF, **optional**), `repo_link`, `video_link` (text), `final_presentation` (file, PDF, optional), `submitted_by` (relation → `users`) | `team = @request.auth.team \|\| @request.auth.role = "admin"`                                 | empty                                |
| `ratings`       | `jury` (relation → `users`), `team` (relation → `teams`), `scores` (json), `finalGrade` (number), `comments` (text)  | `@request.auth.role = "admin" \|\| (@request.auth.role = "jury" && jury = @request.auth.id)`   | Create/Update: `(@request.auth.role = "jury" \|\| @request.auth.role = "admin") && jury = @request.auth.id`; Delete: `@request.auth.role = "admin"` |
| `event_state`   | `published_categories`, `published_at`, `stages`, `finalists`, `tie_winners`, `orders`, `on_stage` (all json)                                                                    | empty                                                                                      | empty                                |
| `jury_notes`    | `jury` (relation → `users`), `team` (relation → `teams`), `content` (text)                                             | empty                                                                                      | empty                                |
| `jury_views`    | `jury` (relation → `users`), `team` (relation → `teams`), `item` (text), `count` (number), `first_at`, `last_at` (text) | empty | empty |

Users must not be able to update their own record: they could change their role, team or jury categories.

The `comments` field of a rating is the feedback for the team: the team sees it (without jury names) after its category is published.

### Deploying for the event

```bash
npm ci && npm run build
```

The project uses `@sveltejs/adapter-auto`, which picks the adapter of the hosting platform it builds on. For your own server install `@sveltejs/adapter-node`, switch `svelte.config.js` to it and start the app with `node build`. (Tested locally with `npm run preview` only.)

`POCKETBASE_URL`, `POCKETBASE_ADMIN_EMAIL`, `POCKETBASE_ADMIN_PASSWORD` and `COOKIE_ENCRYPTION_KEY` are required (see `.env.example`). Set the real deadlines and the schedule in `app_config.yaml`.

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

4.  **Create the PocketBase collections** from the table above (and set their API rules), then add the first admin user (`role = admin`). After that everything happens in the app: jurors and their categories in the Admin Dashboard, teams and participants through the CSV import.

5.  **Start the Development Server:**
    ```bash
    npm run dev
    ```

6.  **Open the App:**
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

Hackathonownik Hybrid License, see [LICENSE](LICENSE).
