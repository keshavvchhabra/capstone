# 💬 ChatHere — Real-Time MERN Chat Application

A **full-stack real-time chat platform** built with the **MERN stack** (MongoDB, Express.js, React.js, Node.js) and **Socket.IO** for instant communication.  
ChatHere enables users to engage in **private and group conversations**, share media, and stay connected — all through a **modern, responsive UI**.

🚀 **Live Demo:** [ChatHere App](https://capstone-439ppnln0-keshavvchhabras-projects.vercel.app/login)  
🗄️ **Database (Neon):** [Neon Dashboard](https://console.neon.tech/app/projects/red-union-62973307/branches/br-still-brook-adzed91f/tables?database=neondb)

---

## 🧠 Project Overview

**ChatHere** is designed to demonstrate advanced **full-stack concepts** such as:
- Secure authentication with JWT
- Real-time data synchronization
- CRUD operations for chats and messages
- Responsive, mobile-friendly UI
- Role-based access control (User/Admin)
- Real-time socket events like typing indicators, read receipts, and online/offline status

---

## 🏗️ System Architecture

mermaid
flowchart TD
    subgraph Client [Frontend - React.js]
        A1[Login/Register Page]
        A2[Chat List]
        A3[Chat Window]
        A4[Profile & Settings]
    end
⚙️ Tech Stack
Layer	Technology
Frontend	React.js, Tailwind CSS, React Router, Axios, Socket.IO Client
Backend	Node.js, Express.js, Socket.IO, JWT, bcrypt, Mongoose
Database	MongoDB (Atlas Cloud)
Hosting	Vercel (Frontend), Render (Backend)
Version Control	GitHub

🔐 Authentication & Authorization

Secure signup/login with JWT (JSON Web Tokens)

Password hashing using bcrypt

Role-based access control for Admin/User

Token stored in HTTP-only cookies for security
