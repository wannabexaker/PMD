# PMD — Project Management Dashboard

PMD (Project Management Dashboard) is a clean, minimal project management tool designed for small teams that want clarity, speed, and extensibility without UI clutter or unnecessary complexity.

The application focuses on **project visibility**, **people assignment**, and **status-driven workflows**, while keeping interaction intuitive and lightweight. PMD is built with a modern web stack and a forward-thinking architecture that allows features to evolve without major refactors.

---

## Core Features

### Projects Dashboard
- Centralized dashboard listing all projects
- Click-to-select interaction (no extra buttons)
- Selecting a project reveals detailed information
- Clicking the same project again deselects it
- When no project is selected, the dashboard shows user statistics:
  - Total assigned projects
  - Projects in progress
  - Completed projects

### Project Organization
- Automatic project grouping by status:
  - Not Started
  - In Progress
  - Completed
  - Canceled
  - Archived
- Completed, canceled, and archived projects are visually separated in dedicated folders
- Folder counters display the number of projects per status
- Built-in search and filters for fast navigation
- Project title limit enforced (32 characters) with hover tooltips for full names

### Assign & People Management
- Assign users to projects through a dedicated Assign view
- Click-based select / deselect behavior for both projects and people
- Each person is displayed in a clean, responsive card with:
  - Name
  - Email
  - Team
- People search and sorting (name, team, project count)
- Per-person project overview grouped by project status

### Archive Lifecycle
- Projects can be archived from the dashboard
- Archived projects are stored separately
- Restore archived projects back to active status
- Permanently delete archived projects when no longer needed

### Email System (Development)
- HTML-only, branded email notifications
- Project assignment notifications
- User registration confirmation flow (email verification ready)
- Local email testing via MailHog (SMTP sink)

---

## Design Philosophy

PMD follows strict design principles:

- **Minimal UI** — no redundant titles, buttons, or visual noise
- **Click over controls** — interaction through direct selection
- **Consistency** — same behavior across dashboard, assign, and people views
- **Extensible architecture** — easy to add roles, auth, and advanced workflows later
- **Frontend-first clarity** — predictable state, clean components, no hidden logic

---

## Tech Stack

### Frontend
- React
- TypeScript (TSX)

### Backend
- Java Spring Boot

### Database
- MongoDB

### Email (Development)
- MailHog (SMTP capture for local testing)

---

## Current Scope

PMD intentionally starts with **simple authentication** and **core project workflows**.  
Advanced features such as role-based access control, permissions, and full email verification are planned and can be added without breaking the existing architecture.

---

## Who PMD Is For

PMD is ideal for:
- Small to mid-size teams
- Internal tools
- Developers who value clean UX and maintainable code
- Projects that need structure without enterprise bloat

---

PMD is built to stay simple — and grow only when needed.
