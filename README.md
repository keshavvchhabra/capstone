Project Overview
ChatHere is a full-stack, real-time chat application that enables users to connect instantly
through private and group conversations. Designed with an intuitive and modern interface,
ChatHere allows users to send messages, share media, and stay connected in real time.
It is built using the MERN stack (MongoDB, Express.js, React.js, Node.js) combined with
Socket.IO for instant communication. The project aims to demonstrate advanced full-stack
concepts such as authentication, CRUD operations, real-time data synchronization, and
responsive UI design.
Key Features
Backend
● Authentication & Authorization
○ Secure user signup and login using JWT (JSON Web Tokens).
○ Password hashing with bcrypt for user data protection.
○ Role-based access control (User / Admin).
● CRUD Operations
○ Create, Read, Update, Delete chats and messages.
○ Manage user profiles and group settings.
● Real-Time Communication
○ Built with Socket.IO for instant messaging.
○ Typing indicators, read receipts, and online/offline status.
○ Group chat creation with multiple participants.
● Filtering, Searching, Sorting, Pagination
○ Search messages and users by keywords.
○ Filter chats by date, unread status, or participants.
○ Paginated chat history for performance optimization.
● Hosting
○ Backend deployed on Render or AWS EC2.
○ API documentation via Swagger UI.
Database
● Database Type: Non-relational (MongoDB)
● Schema Design:
○ Collections: Users, Messages, Chats, Groups.
○ Relationships maintained via Mongoose (user ↔ chat ↔ messages).
● Hosting: MongoDB Atlas Cloud Database
Frontend
● Routing:
○ Pages: Login, Register, Chat List, Chat Window, Profile, Settings.
○ Handled using React Router.
● Dynamic Data Fetching:
○ Uses Axios and Socket.IO client for real-time updates.
○ Live chat synchronization without page refresh.
● UI/UX Features:
○ Fully responsive, modern interface using Tailwind CSS.
○ Dark/light theme toggle.
○ Chat bubbles, avatars, and message timestamps.
○ Smooth animations and transitions for better UX.
● Hosting:
○ Frontend deployed on Vercel or Netlify.
Tech Stack
Layer Technology
Frontend React.js, Tailwind CSS, React Router, Axios, Socket.IO Client
Backend Node.js, Express.js, Socket.IO, JWT, bcrypt, Mongoose
Database MongoDB (hosted on MongoDB Atlas)
Hosting Vercel (Frontend), Render (Backend)
Version Control GitHub