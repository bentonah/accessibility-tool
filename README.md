# Accessibility Analyzer

A lightweight, web-based tool designed to help developers identify and fix accessibility issues on any public website.
Built using React, Node.js, and Puppeteer, this app scans webpages for common accessibility problems like missing alt text, poor color contrast, heading structure issues, and more.

This project was created as part of my Senior Project (CSE 499) for Brigham Young University - Idaho, Winter Semester 2025.


## Features

- User authentication (Login/Register)
- URL-based accessibility scanning (via Axe and Puppeteer)
- Clean, minimal UI with light/dark mode toggle
- Expandable and color-coded accessibility reports
- Scan history with download options
- PDF and TXT export (with user footer info)
- Persistent session & error handling
- Auto-prefixes URL with `https://` if missing


## Tech Stack

- **Frontend**: React, Lucide Icons, Tailwind CSS
- **Backend**: Node.js, Express, Puppeteer, axe-core
- **Authentication**: JSON Web Tokens (JWT)
- **PDF Generation**: jsPDF


## Setup Instructions

1. **Clone the Repository**
  git clone https://github.com/bentonah/accessibility-tool.git
  cd accessibility-tool

2. **Install Backend Dependencies**
  cd backend
  npm install
  node server.js

3. Install Frontend Depencies & Start App.
  cd frontend
  npm install
  npm start

4. Open your browser to http://locahost:3000.

Note: The backend runs on port 4000, the frontend runs on port 3000.
Note: You must have both Node.js and npm installed for the tool to work.
