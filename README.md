# College Attendance Management System

A mobile-friendly, responsive web application for managing classroom attendance with customizable roll number rosters, class-specific persistence, and one-click register formatting.

## Features
- **Interactive Attendance Grid**: Tap roll numbers to mark present/absent with instant visual feedback.
- **Roll Number Management**:
  - Add, edit, delete, and reorder roll numbers.
  - Class-specific `localStorage` persistence.
  - Live search and filter roster.
  - Reset to default rolls anytime.
- **Dynamic Attendance Calculations**: Automatically computes `Present`, `Absent`, `Total`, and `Attendance %`.
- **Formatted Register Output**: Copies clean, multi-line attendance reports ready to share via WhatsApp, email, or LMS.
- **Mobile-First Responsive UI**: Smoothly scales across small phones (320px+), tablets, and desktops.

## Tech Stack
- HTML5
- CSS3 (Vanilla Responsive Grid & Modern Layout)
- JavaScript (Vanilla ES6+ & LocalStorage API)

## How to Run
Simply open `index.html` in any modern web browser or run with a local server:
```bash
npx serve .
```
