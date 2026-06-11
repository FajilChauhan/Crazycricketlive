# 🏏 CrazyCricketLive

A modern cricket tournament and live scoring platform built for local, Crazy, box cricket, community leagues, and professional tournaments.

CrazyCricketLive allows organizers to create tournaments, manage teams, add players, schedule matches, perform live scoring, maintain points tables, and track player statistics in real time.

---

# ✨ Features

## Authentication & User Management

* User Registration
* User Login
* JWT Authentication
* Profile Management
* User Statistics
* Tournament History
* Match History

---

## Tournament Management

* Create Tournament
* Update Tournament
* Delete Tournament
* View Tournament Details
* View All Tournaments
* My Tournaments
* Tournament Dashboard

---

## Team Management

* Create Team
* Update Team
* Delete Team
* Team Details
* Team Members Management
* Captain Selection
* Jersey Number Management
* Team Statistics

---

## Team Member Management

* Add Players to Team
* Remove Players from Team
* Update Player Role
* Assign Captain
* Manage Team Squad

---

## Match Management

* Create Match
* Update Match
* Delete Match
* Match Details
* Match Schedule
* Match Status Management

Supported Match Modes:

* 1v1
* Team vs Team

Supported Match States:

* Upcoming
* Live
* Completed

---

## Toss Management

* Toss Winner Selection
* Bat / Bowl Decision
* Automatic Innings Setup

---

## Playing XI Management

* Select Playing XI
* Team Squad Validation
* Match Ready Teams

---

## Live Scoring

* Real Time Ball By Ball Scoring
* Runs Tracking
* Extras Tracking
* Wickets Tracking
* Commentary Support
* Live Score Updates
* Strike Rotation
* Single Player Mode (1v1)
* Team Match Mode

Supported Extras:

* Wide
* No Ball
* Bye
* Leg Bye

Supported Wickets:

* Bowled
* Caught
* LBW
* Run Out
* Stumped
* Hit Wicket

---

## Innings Management

* Start Innings
* End Innings
* Multi Innings Support
* Target Tracking
* Run Chase Support

---

## Scorecards

### Batting Scorecard

* Runs
* Balls
* Fours
* Sixes
* Strike Rate

### Bowling Scorecard

* Overs
* Maidens
* Runs Conceded
* Wickets
* Economy

---

## Points Table

* Automatic Points Calculation
* Net Run Rate Calculation
* Tournament Standings
* Team Rankings
* Refresh Points Table
* Reset Points Table

---

## Player Statistics

* Match History
* Career Statistics
* Runs Scored
* Wickets Taken
* Match Performance

---

## Search

Global Search Support:

* Users
* Tournaments
* Teams
* Matches

---

## Dashboard

* Total Tournaments
* Total Teams
* Live Matches
* Upcoming Matches
* Completed Matches
* Top Teams
* Top Batters
* Top Bowlers

---

# 🛠 Tech Stack

## Frontend

* React
* TypeScript
* Redux Toolkit
* React Query
* React Router
* Tailwind CSS
* Axios
* React Hook Form
* Zod
* Lucide React

## Backend

* Node.js
* Express.js
* TypeScript
* PostgreSQL
* JWT Authentication
* Bcrypt
* Socket.IO
* Redis

---

# 📂 Project Structure

```bash
src
│
├── modules
│   ├── auth
│   ├── profile
│   ├── tournament
│   ├── team
│   ├── team-member
│   ├── match
│   ├── innings
│   ├── scoreboard
│   ├── point
│   ├── dashboard
│   └── search
│
├── config
│   ├── dbconfig.ts
│   └── redis.ts
│
├── shared
│   ├── middlewares
│   ├── utils
│   └── constants
│
├── socket
│
├── app.ts
└── server.ts
```

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/your-username/Crazycricketlive.git

cd Crazycricketlive
```

## Backend Setup

```bash
npm install
```

Create `.env`

```env
PORT=5000

DATABASE_URL=

JWT_SECRET=

REDIS_HOST=localhost
REDIS_PORT=6379
```

Run Server

```bash
npm run dev
```

## Frontend Setup

```bash
npm install
npm run dev
```

---

# 🔐 Authorization

Authentication uses JWT tokens.

Protected APIs require:

```http
Authorization: Bearer <token>
```

---

# ⚡ Performance Features

* PostgreSQL Query Optimization
* Async/Await Architecture
* Promise.all Parallel Queries
* Redis Caching
* React Query Client Caching
* Socket.IO Live Updates
* Optimized API Structure
* Production Ready Error Handling

---

# 🎯 Future Roadmap

* AI Match Insights
* AI Match Predictions
* Player Rankings
* Tournament Analytics
* Push Notifications
* Mobile Application
* Live Streaming Integration
* Match Highlights
* Sponsor Management
* Admin Dashboard

---

# 👨‍💻 Author

Built with ❤️ for local cricket communities.

CrazyCricketLive aims to digitize Crazy cricket, box cricket, community tournaments, and professional leagues with a modern real-time scoring experience.
