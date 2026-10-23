\# 🛠️ Maintenance Agent (خدمات الصيانة)



A fully functional, bilingual (Arabic/English) AI-powered marketplace for maintenance services. It connects clients with workers (plumbers, electricians, appliance techs) using a bidding system and an escrow-style payment release.



\## 🚀 Features

\- \*\*Bilingual UI:\*\* Full RTL/LTR support for Arabic and English.

\- \*\*Dual Roles:\*\* Separate dashboards for Clients and Workers.

\- \*\*OTP Auth:\*\* Passwordless login via mobile number (mocked in console for dev).

\- \*\*Marketplace Bidding:\*\* Workers can send offers (price + message) or ask for details.

\- \*\*Live Chat \& Media:\*\* Real-time chat with image, video, and location sharing.

\- \*\*Escrow Payment Flow:\*\* Client accepts an offer (funds held). Worker completes the job and uploads photo evidence. Client reviews and releases payment.



\## 💻 Tech Stack

\- \*\*Backend:\*\* Python, FastAPI, SQLAlchemy, SQLite.

\- \*\*Frontend:\*\* React, TypeScript, Vite, Tailwind CSS, i18next.

\- \*\*AI/NLP:\*\* Ready for integration with Arabic dialect models (Faisal, ALLaM) for request classification.



\## ⚙️ How to Run Locally



\### 1. Backend Setup

```bash

cd backend

python -m venv .venv

source .venv/Scripts/activate  # On Windows Git Bash

pip install -r requirements.txt

copy .env.example .env

uvicorn app.main:app --reload

