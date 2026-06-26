Consult Assistance Tool (CAT)

An internal tool developed by Tom Roff to be used by Heartflow to improve the Consult requesting/giving experience.


This repo uses different branches for local testing vs. deployment. The main branch contains production-ready content.

Expected settings:

- Frontend `VITE_SERVER_URL` points to the deployed backend server.
- Backend `CLIENT_ORIGIN` / `CLIENT_ORIGINS` allows the deployed frontend URL.
- Backend uses Render's provided `PORT` environment variable.
- Server start command runs the compiled JavaScript output.
- Production consult data should not rely on local-only files unless persistent storage is configured.

Production URLs (Currently):

VITE_SERVER_URL=https://analyst-hub-server.onrender.com
CLIENT_ORIGIN=https://analyst-hub-lw8.pages.dev

Testing IP Addresses:

VITE_SERVER_URL=http://localhost:3000