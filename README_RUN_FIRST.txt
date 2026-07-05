PhytoSentry Full Website - Manual URL Run

How to run:
1. Extract this ZIP.
2. Double-click START_WEBSITE_WINDOWS.bat.
3. It will open Backend and Frontend in two separate terminal windows.
4. It will NOT open the website automatically.
5. Copy this URL and paste it into your browser:

   http://localhost:5173/

Keep both terminal windows open.

Backend:
- Runs at http://localhost:8000/

Frontend:
- Runs at http://localhost:5173/

Notes:
- START_FRONTEND.bat uses the prebuilt frontend/dist, so it does not run npm install and does not run Vite.
- START_FRONTEND_DEV.bat is included only for developer mode if you want to edit source code later.


UPDATED: Nasalization font applied to this user-uploaded website ZIP: PhytoSentry_Full_Manual_URL_Run.zip


Gyst font implemented across the website.

FULL FIX UPDATE NOTES
---------------------
- Signup/login data is stored in backend/phytosentry.db using SQLite.
- Scan history is also stored in SQLite and shown in Dashboard/History/Admin.
- For mobile/LAN testing, make sure backend is reachable on port 8000.
- Bangla report print works through the browser print dialog. Backend Bangla PDF works best when the server has a Bengali font installed.
