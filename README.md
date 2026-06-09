# 🗳️ Polling App – Real-Time Voting Platform

Polling App is a full-featured polling platform built with **React**, **Supabase**, and **Material-UI**. It supports multiple poll types, real-time vote tracking, quiz functionality, and detailed analytics — all without custom backend code (thanks to Supabase).

## 🚀 Overview

Polling App was built to demonstrate real-time data handling, role-based interactions, and a polished user experience without writing a custom backend. It leverages Supabase for authentication, database, and real-time subscriptions, while React and Material-UI handle the frontend.

## ✨ Key Features

### For Poll Creators
- Create polls with **Multiple Choice**, **Quiz** (with correct answers), or **Rating Scale** (1-5 stars)
- Set optional **expiry dates** for polls
- View real-time vote counts and percentages
- See detailed **analytics** (bar chart / pie chart)
- Receive **push notifications** when someone votes on your poll
- Delete polls you created
- Dark/Light theme toggle

### For Voters
- Browse active polls from all users
- Vote only once per poll (prevents duplicate votes)
- Get **instant feedback** on quiz answers (correct/incorrect)
- Leave optional feedback
- View poll results after voting

### Real-Time Features
- Live vote counts update without refreshing
- Push notifications when someone votes on your poll
- Responsive design (mobile + desktop)

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Material-UI (MUI) |
| **Backend & DB** | Supabase (PostgreSQL + Realtime) |
| **Authentication** | Supabase Auth |
| **State Management** | React Hooks (useState, useEffect, useContext) |
| **Styling** | Emotion (MUI integration) |
| **Charts** | Custom SVG visualizations |
| **Icons** | Material-UI Icons |
| **Deployment** | Netlify (frontend) + Supabase Cloud |

## 🧠 System Design Highlights

### 🔹 Real-Time Architecture (Without Custom Backend)
- Used Supabase's **Realtime subscriptions** to listen for new votes
- Votes appear instantly to poll creators without refreshing
- Avoided building a separate WebSocket server

### 🔹 Authentication & Authorization
- Used Supabase Auth for secure user sign-in/sign-up
- Implemented role-based access (creators vs voters)
- Protected API routes using Supabase Row Level Security (RLS)

### 🔹 Database Schema Design
- Designed relational schema for `polls`, `votes`, and `users`
- Used PostgreSQL with foreign keys and indexes
- Implemented RLS policies to ensure users can only vote once per poll

### 🔹 Frontend State Management
- Managed global theme state using React Context
- Used local state for poll data, vote counts, and notifications
- Implemented memoization (`React.memo`, `useCallback`, `useMemo`) for performance

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/MuhammadShoaib1126/polling-app.git
cd polling-app

# Install dependencies
npm install

# Create .env file (see .env.example below)
# Add your Supabase credentials

# Start development server
npm run dev
