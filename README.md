# 1. Project Title

## PayNest – AI-Powered Income Protection for Gig Workers

# Pitch Deck
https://drive.google.com/file/d/15XWvz6HtAsgM5yVFfO-Or_JBz3V13iGn/view?usp=sharing

# Project Preview
https://paynest-u23g.onrender.com/
---

# 2. Overview

PayNest is an AI-powered parametric micro-insurance platform built for gig workers (for example, delivery partners).  
It protects workers from daily income loss caused by disruptions like heavy rain, poor AQI, and extreme conditions.

Unlike traditional insurance, PayNest focuses on:
- low-cost weekly protection,
- automated trigger-based claim handling,
- zero-touch payout flow with minimal manual effort.

---

# 3. Problem Statement

Gig workers are highly dependent on daily earnings, but real-world conditions can stop their work.

Common risks:
- Extreme weather (rain, heat, wind)
- High pollution (AQI spikes)
- City-level disruptions and route volatility

Why current insurance models fail for this segment:
- Expensive premiums
- Complex onboarding/claims
- Slow and manual reimbursement process

---

# 4. Target Persona

**Example user: Rahul (Delivery Partner)**
- Age: 25–35
- Income pattern: daily/weekly cash flow dependent
- Work mode: outdoor, high exposure to weather and pollution
- Pain points: unpredictable income drops, no safety net
- Need: affordable, fast, automatic protection with transparent payouts

---

# 5. Solution

PayNest introduces a parametric insurance model designed for the gig economy:
- AI-driven premium computation
- Real-time disruption monitoring
- Automatic claim triggering on threshold breach
- Fast payout simulation and coverage updates
- Weekly subscription format for affordability

Core idea: **automation + AI + micro-insurance**.

---

# 6. How It Works

1. User signs up / logs in  
2. User completes profile (city, work type, daily income)  
3. AI computes dynamic premium and risk level  
4. User selects plan (Basic / Standard / Premium)  
5. Payment activates 7-day coverage  
6. System continuously monitors disruption signals  
7. If trigger conditions are met, claim is auto-evaluated  
8. If valid, payout is credited (or cancelled if fraud-risk block applies)  
9. Dashboard updates in real time with status and coverage remaining

---

# 7. System Architecture

```text
Frontend (React + Tailwind)
        ↓
Backend API (Node.js + Express)
        ↓
AI Services (Python/Flask models)
        ↓
External Data APIs (Weather, AQI) + MongoDB
```

> You can add a visual architecture diagram image here later.

---

# 8. Features

- User onboarding and profile setup
- Dynamic AI-based premium pricing
- Plan management (Basic/Standard/Premium)
- Weekly subscription lifecycle and renewals
- Zero-touch automatic claims
- Fraud-risk aware claim cancellation flow
- Claims, coverage, and payout history dashboards

---

# 9. AI Architecture

## Model 1: Premium Prediction

- **Description:** Estimates weekly premium based on disruption risk factors  
- **Algorithm:** Linear Regression  
- **Inputs:** Rainfall, AQI, area risk, historical disruptions  
- **Outputs:** Risk score + recommended weekly premium  

## Model 2: Fraud Detection (Future)

- **Description:** Flags suspicious claims before payout  
- **Algorithm (planned):** Isolation Forest / anomaly detection pipeline  
- **Inputs:** Location consistency, claim frequency, activity behavior, metadata  
- **Outputs:** Fraud probability / block decision / manual override signal  

---

# 10. Business Model

- Weekly paid subscription plans for gig workers
- Tiered protection: Basic, Standard, Premium
- Revenue generated through recurring micro-premium collection
- Scales with city and worker-network expansion

---

# 11. Feasibility

- **Tech feasibility:** Uses production-ready stack (React, Node, MongoDB, API integrations)  
- **Cost efficiency:** Lightweight architecture + API-driven data collection  
- **Scalability:** Multi-city onboarding with modular trigger logic and model endpoints  

---

# 12. Impact

PayNest improves financial resilience for gig workers by:
- reducing income-shock risk,
- simplifying protection access,
- automating payout decisions,
- increasing trust through transparent trigger and coverage logic.

---

# 13. Future Enhancements

- Advanced ML-driven fraud detection
- GPS-level route and activity validation
- Predictive disruption forecasting
- Multi-city and multi-platform scaling
- Improved claim explainability for users/admins

---

# 14. Tech Stack

## Frontend
- React.js
- Tailwind CSS
- Vite

## Backend
- Node.js
- Express.js

## AI/ML
- Python
- Flask
- Scikit-learn

## APIs & Services
- Open-Meteo / weather provider
- AQI provider APIs
- Razorpay (test/simulated flow)

## Database & Tools
- MongoDB
- Git/GitHub

---

# 15. Installation & Setup

## 1) Clone repository

```bash
git clone https://github.com/your-username/paynest.git
cd paynest
```

## 2) Install dependencies

```bash
npm install
```

## 3) Configure environment variables

Create `.env` at project root:

```env
MONGODB_URI=your_mongodb_uri
API_NINJAS_KEY=your_aqi_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Optional (admin):

```env
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin@123
```

## 4) Run backend

```bash
npm run server
```

## 5) Run frontend

```bash
npm run dev
```

## 6) (Optional) Run external ML service

If using a separate Python model service:

```bash
cd ai-services
pip install -r requirements.txt
python app.py
```

---

# 16. API Flow / Example

## Request (Node -> ML)

```json
{
  "rainfall": 80,
  "aqi": 300,
  "area_risk": 2,
  "past_disruptions": 3
}
```

## Response

```json
{
  "risk": "HIGH",
  "premium": 55
}
```

---

# 17. Project Flow

Login -> Profile -> AI Pricing -> Plan Selection -> Payment -> Monitoring -> Disruption Trigger -> Auto Claim -> Payout -> Dashboard Update -> Weekly Renewal

---

# 18. Challenges Faced

- Building realistic-yet-affordable pricing behavior
- Handling real-time weather/AQI API variability
- Designing reliable zero-touch claim logic
- Balancing fraud controls with user trust and speed

---

# 19. Conclusion

PayNest transforms traditional insurance into an AI-assisted, automation-first safety net for gig workers.  
It combines affordability, real-time intelligence, and transparent payout logic to provide practical financial protection during unpredictable disruptions.

