# PayNest – AI-Powered Income Protection for Gig Workers

## Overview

PayNest is an AI-powered parametric micro-insurance platform designed for gig economy workers such as delivery partners. It protects workers from income loss caused by real-world disruptions like heavy rainfall, poor air quality, and urban traffic conditions.

Unlike traditional insurance systems, PayNest eliminates manual claims and introduces a fully automated, zero-touch claim process with dynamic pricing and instant payouts.

---

## Problem Statement

Gig workers depend on daily earnings for their livelihood. However, their ability to work is often affected by:

* Extreme weather conditions (rain, heat)
* High pollution levels (AQI)
* Traffic disruptions and urban conditions

Existing insurance solutions are:

* Expensive and complex
* Not tailored for gig workers
* Dependent on manual claim processes

This creates a gap where workers remain financially vulnerable.

---

## Solution

PayNest introduces a parametric insurance model with:

* AI-driven dynamic premium calculation
* Real-time disruption detection using external APIs
* Automated claim triggering without user action
* Instant payout simulation
* Weekly micro-insurance plans

The system ensures fairness, transparency, and accessibility.

---

## System Architecture

Frontend (React)
↓
Backend (Node.js + Express)
↓
AI Services (Python Flask APIs)
↓
External APIs (Weather, AQI) + Database (MongoDB)

---

## Key Features

### 1. Registration Process

* User login via basic authentication
* User profile includes city, work type, and daily income

### 2. Insurance Policy Management

* Three fixed plans:

  * Basic
  * Standard
  * Premium
* Weekly subscription model
* Coverage and premium stored per policy

### 3. Dynamic Premium Calculation (AI)

* Inputs:

  * Rainfall
  * AQI
  * Area Risk
  * Past Disruptions

* Output:

  * Risk Score
  * Weekly Premium

* Implemented using Linear Regression

* Normalized dataset ensures affordable pricing (₹20–₹70 range)

---

### 4. Disruption Detection (Automation)

System continuously monitors:

* Weather conditions (rainfall)
* Air Quality Index (AQI)
* Temperature (optional)
* Traffic conditions (mock)

Example triggers:

* Rainfall > 50 mm
* AQI > 300
* Temperature > 40°C

---

### 5. Zero-Touch Claim System

* Claims are automatically triggered when disruption conditions are met
* No manual application required
* System validates basic conditions (location match, activity)

---

### 6. Payout System

Payout is calculated using:

Payout = min(daily_income × factor, remaining_coverage)

Where:

* Factor depends on plan (70%–90%)
* Total payout is capped by plan coverage

Example:

* Daily Income = ₹500
* Standard Plan → ₹400 per disruption
* Coverage limit = ₹2500

---

### 7. Dashboard

Worker dashboard includes:

* Active policy
* Remaining coverage
* Risk level
* Claim history
* Real-time disruption alerts

---

### 8. Weekly Cycle

* Policy valid for 7 days
* Premium locked at purchase
* Renewal required after expiry
* Optional no-claim bonus

---

## AI/ML Implementation

### Premium Prediction Model

* Algorithm: Linear Regression

* Dataset: Simulated, normalized data

* Features:

  * Rainfall
  * AQI
  * Area Risk
  * Past Disruptions

* Output:

  * Risk Score
  * Weekly Premium

### Fraud Detection (Planned - Phase 3)

* Isolation Forest (Anomaly Detection)
* Checks:

  * Location mismatch
  * Unusual claim frequency
  * Activity anomalies

---

## Tech Stack

Frontend:

* React.js
* Tailwind CSS

Backend:

* Node.js
* Express.js

Database:

* MongoDB

AI Services:

* Python
* Flask
* Scikit-learn

APIs:

* OpenWeather API (weather data)
* WAQI API (air quality data)

Maps:

* Leaflet + OpenStreetMap

Payments:

* Razorpay (test mode / simulated)

---

## Installation and Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/paynest.git
cd paynest
```

---

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### 3. Setup Backend

```bash
cd backend
npm install
npm start
```

---

### 4. Setup AI Model (Flask)

```bash
cd ai-services
pip install -r requirements.txt
python app.py
```

---

### 5. Environment Variables

Create `.env` file in backend:

```env
WEATHER_API_KEY=your_key
AQI_API_KEY=your_key
RAZORPAY_KEY=your_key
```

---

## API Flow Example

### Request (Node → ML)

```json
{
  "rainfall": 80,
  "aqi": 300,
  "area_risk": 2,
  "past_disruptions": 3
}
```

### Response

```json
{
  "risk": "HIGH",
  "premium": 55
}
```

---

## Project Flow

Login → Enter Details → AI Premium Calculation → Choose Plan → Payment → Monitoring → Disruption Detection → Auto Claim → Payout → Dashboard Update → Weekly Renewal

---

## Challenges Faced

* Designing realistic yet simple pricing model
* Handling real-time API integration
* Implementing zero-touch claim system
* Ensuring affordability for gig workers

---

## Future Scope

* Advanced fraud detection using ML
* GPS-based validation system
* Predictive analytics for disruption forecasting
* Multi-city and platform scaling

---

## Conclusion

PayNest transforms traditional insurance into an automated, AI-driven, worker-friendly system. It ensures that gig workers are financially protected against unpredictable disruptions while maintaining simplicity and accessibility.

---
