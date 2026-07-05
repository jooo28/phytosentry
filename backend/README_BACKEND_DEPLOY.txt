PhytoSentry Backend Deployment
==============================

Recommended host:
Render, Railway, or VPS.

Do not deploy this backend to Vercel Functions because it uses TensorFlow, a .keras model, uploads, reports, SQLite DB, weather cache, chatbot history, and generated PDF files.

Render setup:
- Use the included render.yaml.
- It mounts a persistent disk at /var/data.
- It sets PHYTOSENTRY_DATA_DIR=/var/data.

Required production environment variables:
PHYTOSENTRY_CORS_ORIGINS=https://your-vercel-app.vercel.app,https://your-custom-domain.com
PHYTOSENTRY_FRONTEND_URL=https://your-vercel-app.vercel.app
PHYTOSENTRY_DATA_DIR=/var/data

Optional SMTP variables for real reset email delivery:
PHYTOSENTRY_SMTP_HOST=
PHYTOSENTRY_SMTP_PORT=587
PHYTOSENTRY_SMTP_USER=
PHYTOSENTRY_SMTP_PASS=
PHYTOSENTRY_EMAIL_FROM=

Test endpoints after deploy:
/api/health
/api/deploy-check
/api/model-info

Storage:
All runtime data is saved under PHYTOSENTRY_DATA_DIR:
- phytosentry.db
- uploads/
- reports/
- weather cache
- chatbot messages
- expert bookings
