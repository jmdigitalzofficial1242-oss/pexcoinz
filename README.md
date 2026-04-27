# PexCoin Exchange Platform

Welcome to the PexCoin Cryptocurrency Exchange platform! This is a complete, production-ready full-stack application that includes both the user frontend and the backend API, connected to a secure MongoDB database.

## 🌟 Key Features
- **Secure Authentication**: Encrypted signup, login, and JWT-based session management.
- **Wallet & Ledger System**: Highly secure ledger architecture for handling user balances without race conditions.
- **Transactions**: Users can easily request deposits and withdrawals.
- **Admin Dashboard**: Full administrative control to approve/reject deposits and withdrawals, and monitor platform activity.
- **Responsive UI**: A premium, modern dashboard built with React and Tailwind CSS.

## 🛠️ Technology Stack
- **Frontend**: React.js, TypeScript, Tailwind CSS, Wouter, React Query
- **Backend**: Node.js, Express.js, TypeScript, Zod for validation
- **Database**: MongoDB (Mongoose)

---

## 🚀 How to Deploy on Render (Production)

This repository is pre-configured with a `render.yaml` file for automatic deployment on [Render.com](https://render.com). 

### Simple Deployment Steps:
1. Create an account or log in to [Render](https://render.com).
2. From the Render Dashboard, click on **New** and choose **Blueprint**.
3. Connect your GitHub account and select this private repository.
4. Render will automatically detect the configuration and begin building the Client and Server.
5. Once deployed, go to your Web Service settings, click on the **Environment** tab, and add the following variables:

| Variable Name | Required Value |
|---|---|
| `MONGODB_URI` | Your MongoDB connection string (e.g., from MongoDB Atlas) |
| `JWT_SECRET` | A secure random string for user tokens (e.g., `super_secret_key_123`) |
| `PASSWORD_SALT` | A secure string for hashing passwords (e.g., `pexcoin_secure_salt`) |

*(Render will automatically provide you with a free live `.onrender.com` URL once the build finishes)*

---

## 💻 How to Run Locally (Development)

If you want to run or test the app on your own computer:

### 1. Requirements
- Node.js installed
- A MongoDB connection string

### 2. Setup
Create a `.env` file inside the `server/` directory and add your credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PASSWORD_SALT=your_password_salt
```

### 3. Build & Run
Open your terminal in the root folder (`pexcoin-live`) and run:
```bash
# This will install packages and build both client and server
npm run build

# This will start the live server on port 5000
npm start
```

Visit `http://localhost:5000` in your browser.
