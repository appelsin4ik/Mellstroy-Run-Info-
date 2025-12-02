# 🎮 Mellstroy Run (https://www.mellstroy-run.com)

**Mellstroy Run** is a fast-paced browser arcade game that mixes an endless runner with a slot machine mini-game and an online leaderboard.

You run, dodge obstacles, collect coins, spin the slots and try to climb into the global Top-10 — all directly in the browser, no installation required.

> ⚠️ **Language note**  
> Right now the game interface and in-game messages are available **only in Russian**.  
> I’m planning to add full localization (starting with English and more languages) in future updates.

---

## 📦 About This Repository

This repository is a **public game repo** that contains:

- The **game code** (frontend + backend logic).
- Static assets required to run the game.
- A safe configuration setup using environment variables.

My **main Mellstroy Run repository** is private because it contains:

- Sensitive configuration and secrets (e.g. real MongoDB credentials, deployment settings).
- Internal tooling / scripts that are not meant for public use.

To keep the project secure and still allow people to explore or contribute to the game, I publish **this sanitized version** here.

> 💬 **Access to the main repo**  
> If you’re seriously interested in contributing, reviewing the full history, or collaborating on the project, I can grant access to the private main repository on request.  
> Please contact me (via GitHub profile or by opening an issue) and briefly describe what you’d like to work on.

---

## ✨ Features

- 🏃 **Endless runner gameplay** – jump over obstacles, survive as long as possible and scale the difficulty curve.
- 🎰 **Slot machine mini-game** – spend coins to spin animated reels and get temporary boosts / rewards.
- 🪙 **Coins & upgrades** – collect coins during the run and use them in the shop (прилавок) to unlock skins and cosmetic upgrades.
- 🧍 **Skins system** – multiple character skins with score-based unlocks and persistence per player.
- 🏆 **Online leaderboard** – best scores are stored in MongoDB and shown in a live Top-10 list.
- 📱 **Mobile-friendly** – touch controls on canvas, usable inside in-app browsers (e.g. TikTok / Instagram).
- 💾 **Per-user identity** – each device gets a stable `userId` to tie scores, coins, skins and spins together.
- 🔊 **Sound FX & music** – arcade-style sounds for jumps, failures, jackpots and more.

---

## 🧩 Tech Stack

**Frontend**

- HTML5 Canvas for rendering and game loop.
- Vanilla JavaScript for gameplay, physics, slots, coins/skins, leaderboards.
- Custom CSS for UI: HUD, slot window, banners, shop, menus.

**Backend**

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) REST API.
- [MongoDB](https://www.mongodb.com/) (e.g. via MongoDB Atlas) for persistence.
- [Mongoose](https://mongoosejs.com/) models for scores, coins, skins and spins.
- Environment variables handled via [`dotenv`](https://www.npmjs.com/package/dotenv).

---

## 🕹 Gameplay & Controls

**Desktop (keyboard)**

- `SPACE` – jump / start the run  
  Hold longer → higher jump.

**Mobile (touch)**

- Tap inside the canvas to jump.  
  Longer press → higher jump.

**Gameplay loop**

1. Enter your nickname on the start screen.
2. Press **PLAY**.
3. Dodge obstacles and survive as long as possible.
4. Collect coins during the run.
5. Spend coins on:
   - **Shop (Прилавок)** – unlock and select skins.
   - **Slot machine** – press “КРУТИТЬ” if you have spins/coins.
6. When you lose, your score is submitted and may appear in the leaderboard.

---

## 🗣 Localization

- ✅ Current: All UI texts and in-game messages are **Russian-only**.
- 🔜 Planned:
  - Extract all strings to a localization file.
  - Add a **language switcher** (RU / EN).
  - Translate UI, toasts, and error messages.

If you want to help with translation, feel free to open an issue or pull request.

---

## 🚀 Getting Started (Local Development)

### 1. Requirements

- Node.js **v18+** (recommended)
- npm
- A MongoDB connection (local or Atlas)

### 2. Clone & install

```bash
git clone https://github.com/<your-username>/<this-public-repo>.git
cd <this-public-repo>
npm install
