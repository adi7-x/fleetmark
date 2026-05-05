<p align="center">
  <img src="https://img.shields.io/badge/Score-125%2F100-brightgreen?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/42_Network-000000?style=for-the-badge&logo=42&logoColor=white" />
</p>

<h1 align="center">🚀 ft_transcendence — FLEET MARK</h1>

<p align="center">
  <i>The final project. The grand finale of the 42 common core.</i>
  <br><br>
  A full-stack <b>smart transportation platform</b> built with Django, React, PostgreSQL, and Docker —<br>
  featuring real-time interactions, user authentication, and modern web architecture.
</p>

---

## 📋 Table of Contents

- [About](#-about)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Features](#-features)
- [Getting Started](#-getting-started)
- [Environment Setup](#-environment-setup)
- [API Overview](#-api-overview)
- [Security](#-security)
- [Team](#-team)
- [Author](#-author)

---

## 💡 About

**ft_transcendence** is the capstone project of the 42 common core — a full-stack web application that demonstrates mastery of modern web development. Our team, **FLEET MARK**, built a smart transportation platform from the ground up.

### Why "FLEET MARK"?

The name represents our team identity — **Fleet** for speed and coordination, **Mark** for precision and impact. We chose to build something meaningful beyond the typical Pong game, applying the project's requirements to a real-world domain.

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────┐
│                 FLEET MARK STACK                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  Frontend:   React + TypeScript                  │
│  Backend:    Django (Python) + REST Framework     │
│  Database:   PostgreSQL                          │
│  Caching:    Redis (optional)                    │
│  Container:  Docker + Docker Compose             │
│  Build:      Makefile orchestration              │
│                                                  │
└─────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | React + TypeScript | Modern, type-safe UI |
| **Backend** | Django REST Framework | API endpoints, business logic |
| **Database** | PostgreSQL | Persistent data storage |
| **DevOps** | Docker Compose | One-command deployment |
| **Build** | Makefile | Simplified orchestration |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│              │     │                  │     │              │
│   React      │────→│  Django API      │────→│  PostgreSQL  │
│   Frontend   │     │  (REST)          │     │  Database    │
│   :3000      │     │  :8000           │     │  :5432       │
│              │     │                  │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
        │                    │
        └────────────────────┘
              Docker Network
```

All services run in **Docker containers** and communicate through an internal Docker network. A single `make` command brings everything up.

---

## ✨ Features

### Core Features
- ✅ **User Authentication** — secure registration, login, sessions
- ✅ **User Profiles** — customizable profiles with avatars
- ✅ **Real-time Interactions** — live updates and notifications
- ✅ **RESTful API** — clean, documented endpoints
- ✅ **Responsive Design** — works on desktop and mobile

### Technical Requirements
- ✅ **Dockerized** — every service runs in a container
- ✅ **PostgreSQL** — robust relational database
- ✅ **Security** — HTTPS-ready, input validation, CSRF protection
- ✅ **Single Page Application** — React client-side routing

---

## 🚀 Getting Started

### Prerequisites

- Docker & Docker Compose
- GNU Make

### Quick Start

```bash
# Clone the repository
git clone https://github.com/adi7-x/fleetmark.git
cd fleetmark

# Copy environment variables
cp .env.example .env

# Build and start all services
make

# Stop all services
make down

# Rebuild
make re
```

### Access

```
Frontend:  http://localhost:3000
Backend:   http://localhost:8000/api/
Admin:     http://localhost:8000/admin/
```

---

## ⚙️ Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Database
POSTGRES_DB=fleetmark
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password

# Django
DJANGO_SECRET_KEY=your_secret_key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Frontend
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 📡 API Overview

The backend exposes a RESTful API:

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/auth/register/` | Create new account |
| `POST` | `/api/auth/login/` | Authenticate user |
| `GET` | `/api/users/me/` | Get current user profile |
| `PUT` | `/api/users/me/` | Update profile |
| `GET` | `/api/users/` | List all users |

---

## 🔐 Security

| Measure | Implementation |
|:--------|:---------------|
| **Authentication** | Token-based (JWT) |
| **Password Storage** | Django's PBKDF2 hashing |
| **CSRF Protection** | Django middleware |
| **Input Validation** | Server-side + client-side |
| **SQL Injection** | Django ORM parameterized queries |
| **Environment Vars** | Secrets in `.env`, not in code |

---

## 📁 Project Structure

```
fleetmark/
├── backend/
│   └── src/               # Django application
│       ├── manage.py
│       ├── settings.py
│       ├── urls.py
│       └── apps/          # Django apps
├── frontend/
│   └── src/               # React application
│       ├── components/
│       ├── pages/
│       └── services/
├── shared/                # Shared configurations
├── docs/                  # Documentation
├── docker-compose.yml     # Service orchestration
├── Makefile               # Build commands
├── .env.example           # Environment template
├── CONTRIBUTING.md        # Contribution guidelines
└── README.md
```

---

## 👥 Team

**FLEET MARK** — 42 School Final Project Team

> This project represents the culmination of the 42 common core curriculum, demonstrating full-stack development skills, DevOps practices, and team collaboration.

---

## 👤 Author

**Adil Bourji** — [@adi7-x](https://github.com/adi7-x)

<p align="center">
  <a href="https://github.com/adi7-x"><img src="https://img.shields.io/badge/GitHub-adi7--x-181717?style=flat-square&logo=github" /></a>
  <a href="https://linkedin.com/in/adil-bourji"><img src="https://img.shields.io/badge/LinkedIn-Adil_Bourji-0A66C2?style=flat-square&logo=linkedin" /></a>
</p>

<p align="center"><sub>42 School · Common Core · Final Project · Full Stack</sub></p>
