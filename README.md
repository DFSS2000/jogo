# Last Day: Together — Assembled Project

This project was generated automatically using assets you uploaded.

## Structure

- `client/` - static client files (index.html, src/main.js)
- `server.js` - Node.js server (Express + Socket.IO) that serves client and provides multiplayer
- `assets/` - assets you uploaded (images, audio). Referenced by client via `assets/` paths
- `package.json` - for server dependencies

## How to run locally (multiplayer)

1. Install Node.js (v16+ recommended)
2. In the project root:
   ```
   npm install
   npm start
   ```
3. Open `http://localhost:8080` in your browser. Open multiple tabs to test multiplayer.

## Deploy to GitHub Pages + server

- GitHub Pages can host client (`client/index.html`) but multiplayer requires the server (hosted separately).
- You can host the client on GitHub Pages and the server on Render/Heroku/VPS.