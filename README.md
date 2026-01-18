# 🚌 SSBS — Smart School Bus System

> **ft_transcendence project** — A full-stack web application for smart school bus management.

![Project Status](https://img.shields.io/badge/status-in%20development-yellow)
![42 School](https://img.shields.io/badge/42-ft__transcendence-blue)

---

## 📋 Table of Contents

- [About](#-about)
- [Team Rules](#-team-rules)
- [How to Join the Project](#-how-to-join-the-project)
- [Branch Strategy](#-branch-strategy)
- [Your Daily Workflow](#-your-daily-workflow)
- [Commit Rules](#-commit-rules)
- [Weekly Meetings](#-weekly-meetings)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)

---

## 🎯 About

**SSBS (Smart School Bus System)** is a web application designed to manage and track school bus operations efficiently. This project is part of the 42 school curriculum (ft_transcendence).

---

## � Tech Stack

> **⚠️ To Be Decided by Each Team Member**

| Layer | Technology | Status | Responsible |
|-------|------------|--------|-------------|
| **Frontend** | *TBD* | 🟡 Not decided | Frontend Dev |
| **Backend** | *TBD* | 🟡 Not decided | Backend Team |
| **Database** | PostgreSQL | ✅ Confirmed | Backend Team |
| **Authentication** | *TBD* | 🟡 Not decided | Security/DevOps |
| **Containerization** | Docker & Docker Compose | ✅ Confirmed | Security/DevOps |
| **CI/CD** | GitHub Actions | ✅ Confirmed | Security/DevOps |

### How Tech Decisions Work:
- **Frontend Dev** → Chooses frontend framework (React, Vue, Vanilla JS, etc.)
- **Backend Team** → Chooses backend framework (Django, NestJS, Node.js, etc.)
- **Security/DevOps** → Sets up auth system, Docker, deployment

> **Each member decides the tools for their own area!**

---

## �🚨 Team Rules

> **⚠️ READ THIS CAREFULLY BEFORE YOU START!**

| Rule | Description |
|------|-------------|
| ✅ | **Work ONLY on YOUR branch** |
| ✅ | **Pull before you start working** |
| ✅ | **Commit with clear messages** |
| ✅ | **Create Pull Request for review** |
| ✅ | **Attend weekly meetings** |
| ✅ | **Report your weekly progress** |
| ❌ | **NEVER push directly to `main`, `develop`, `frontend`, or `backend`** |
| ❌ | **NEVER merge your own PR without review** |

---

## 🤝 How to Join the Project

### Step 1: Accept the Invitation
1. Check your **email** or **GitHub notifications**
2. Click **"Accept Invitation"**
3. You now have access to the repository!

### Step 2: Clone the Repository
```bash
git clone https://github.com/USERNAME/SSBS_FT_.git
cd SSBS_FT_
```

### Step 3: Set Up Your Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### Step 4: Find Your Branch
| Your Role | Your Base Branch | Your Personal Branch Example |
|-----------|------------------|------------------------------|
| Frontend Developer | `frontend` | `feat/frontend-login-YOURNAME` |
| Backend Developer | `backend` | `feat/backend-api-YOURNAME` |
| Security & DevOps | `develop` | `feat/security-auth-YOURNAME` |

---

## 🌳 Branch Strategy

```
main                    ← 🔒 PROTECTED - Only for stable releases
│
└── develop             ← 🔒 PROTECTED - Integration branch
    │
    ├── frontend        ← Frontend team merges here
    │   └── feat/frontend-*-YOURNAME    ← YOUR work branch
    │
    └── backend         ← Backend team merges here
        └── feat/backend-*-YOURNAME     ← YOUR work branch
```

### Branch Rules

| Branch | Who Can Push | Who Can Merge |
|--------|--------------|---------------|
| `main` | ❌ Nobody | Team Lead only |
| `develop` | ❌ Nobody | After review |
| `frontend` | ❌ Nobody | After PR review |
| `backend` | ❌ Nobody | After PR review |
| `feat/*-YOURNAME` | ✅ Only YOU | YOU → via PR |

---

## 🔄 Your Daily Workflow

### 🟢 EVERY DAY Before You Start:

```bash
# 1. Go to your base branch
git checkout frontend      # (or backend if you're backend dev)

# 2. Get latest changes
git pull origin frontend

# 3. Go to your feature branch (or create one)
git checkout feat/frontend-login-yourname

# 4. Merge latest changes into your branch
git merge frontend
```

### 🟡 While Working:

```bash
# Make small commits often!
git add .
git commit -m "feat(frontend): add login button"

# Push your work (save it to GitHub)
git push origin feat/frontend-login-yourname
```

### 🔴 When Your Feature is DONE:

```bash
# 1. Push all your changes
git push origin feat/frontend-login-yourname

# 2. Go to GitHub website
# 3. Create Pull Request:
#    FROM: feat/frontend-login-yourname
#    TO:   frontend
# 4. Request review from a teammate
# 5. Wait for approval
# 6. Merge after approval
```

---

## ✍️ Commit Rules

### Format
```
<type>(<scope>): <description>
```

### Types
| Type | When to Use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `style` | CSS, formatting |
| `refactor` | Code improvement |
| `docs` | Documentation |

### Examples

```bash
# ✅ GOOD - Be clear and specific
git commit -m "feat(frontend): add user login form"
git commit -m "fix(frontend): fix button alignment on mobile"
git commit -m "style(frontend): update dashboard colors"

# ❌ BAD - NEVER DO THIS
git commit -m "update"
git commit -m "fix"
git commit -m "done"
git commit -m "asdf"
git commit -m "changes"
```

---

## 📅 Weekly Meetings

> **🚨 MANDATORY FOR ALL TEAM MEMBERS**

### Meeting Schedule
| Day | Time | Platform |
|-----|------|----------|
| **Every Sunday** | **20:00 (8 PM)** | Discord / Google Meet |

*(Update day/time based on team agreement)*

---

## 📝 Weekly Progress Report

> **Before EVERY meeting, each member MUST prepare this report!**

### Report Template

Copy this and fill it before the meeting:

```markdown
═══════════════════════════════════════════════════
📊 WEEKLY REPORT - [YOUR NAME]
═══════════════════════════════════════════════════
📅 Week: [DATE] to [DATE]
🌿 My Branch: feat/frontend-xxx-myname

───────────────────────────────────────────────────
✅ WHAT I DID THIS WEEK:
───────────────────────────────────────────────────
1. [Task 1] - DONE ✓
2. [Task 2] - DONE ✓
3. [Task 3] - 80% complete

───────────────────────────────────────────────────
🔨 WHAT I'M CURRENTLY WORKING ON:
───────────────────────────────────────────────────
- Task: [description]
- Progress: XX%
- Expected completion: [date]

───────────────────────────────────────────────────
🎯 WHAT I WILL DO NEXT WEEK:
───────────────────────────────────────────────────
1. [ ] Planned task 1
2. [ ] Planned task 2
3. [ ] Planned task 3

───────────────────────────────────────────────────
❌ BLOCKERS / PROBLEMS:
───────────────────────────────────────────────────
- [Any issues or help needed]

───────────────────────────────────────────────────
🔗 MY PULL REQUESTS THIS WEEK:
───────────────────────────────────────────────────
- PR #XX: [title] - [merged/pending]

═══════════════════════════════════════════════════
```

### Meeting Agenda (45 min)
| Time | Topic |
|------|-------|
| 5 min | Check-in - Is everyone here? |
| 20 min | Each member presents their report |
| 10 min | Discuss blockers & help each other |
| 10 min | Plan next week's goals |

---

## 📊 How We Track Your Work

### Everyone Can See:
- ✅ Your **commits** on GitHub
- ✅ Your **Pull Requests**
- ✅ Your **branch activity**
- ✅ Your **code reviews**

### Evaluators Will Check:
- Individual contribution per member
- Commit history & quality
- PR review process
- **Fair work distribution!**

---

## 📁 Project Structure

```
SSBS_FT_/
├── frontend/               # 👈 Frontend developers work here
│   └── src/
│
├── backend/                # 👈 Backend developers work here
│   └── src/
│
├── shared/                 # Shared utilities & types
├── docs/                   # Documentation & meeting notes
├── docker-compose.yml      # Docker setup
├── .env.example            # Environment template
├── CONTRIBUTING.md         # Detailed contribution guide
└── README.md               # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js (for frontend)

### Quick Start

```bash
# 1. Clone
git clone https://github.com/USERNAME/SSBS_FT_.git
cd SSBS_FT_

# 2. Setup environment
cp .env.example .env

# 3. Run with Docker
docker-compose up --build

# 4. Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Useful Commands
```bash
make help      # Show all available commands
make up        # Start all services
make down      # Stop all services
make logs      # View logs
```

---

## 👥 Team (4 Members)

| Member | Role | Responsibility | Branch | GitHub |
|--------|------|----------------|--------|--------|
| *Name 1* | Frontend Developer | UI/UX, Frontend Logic | `frontend` | @username |
| *Name 2* | Backend Developer | API, Database | `backend` | @username |
| *Name 3* | Backend Developer | API, Database | `backend` | @username |
| *Name 4* | Security & DevOps | Auth, Docker, CI/CD | `develop` | @username |

> **Note:** Each member is responsible for their own area. Update names and GitHub usernames.

---

## 📞 Communication

| Channel | Link |
|---------|------|
| **Discord Server** | [Join Link] |
| **Meeting Room** | [Google Meet / Discord] |
| **Project Board** | [GitHub Projects Link] |

---

## ⚠️ Important Reminders

### DO ✅
- Pull latest changes every day
- Make small, frequent commits
- Ask for help when stuck
- Review teammates' PRs
- Attend all meetings
- Submit weekly reports

### DON'T ❌
- Push to protected branches
- Skip meetings without notice
- Leave PRs open too long
- Write unclear commit messages
- Work without creating a branch

---

<p align="center">
  <b>🚀 Let's build something great together! 🚀</b>
  <br><br>
  Made with ❤️ by the SSBS Team
</p>
