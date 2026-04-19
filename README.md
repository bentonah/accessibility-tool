# Accessibility Analyzer

A full-stack web application that helps developers identify and fix accessibility issues on any public website.

It performs automated audits using real browser rendering and highlights common issues such as missing alt text, poor contrast, and improper heading structure—making it easier to catch problems before deployment.


## Features

- User authentication (JWT-based login/register)
- Accessibility scanning using axe-core + Puppeteer
- Real-time analysis of any public URL
- Expandable, color-coded issue reports
- Scan history with download support
- Export reports as PDF or TXT (with user metadata)
- Light/dark mode UI
- Automatic URL normalization (https:// handling)
- Persistent sessions and error handling


## Tech Stack

- **Frontend**: React, Lucide Icons, Tailwind CSS
- **Backend**: Node.js, Express, Puppeteer, axe-core
- **Authentication**: JSON Web Tokens (JWT)
- **PDF Generation**: jsPDF


## How It Works
1. User submits a URL
2. Backend launches a headless browser using Puppeteer
3. axe-core runs accessibility checks on the rendered page
4. Results are processed and categorized
5. Data is returned and displayed in a structured UI


## Setup Instructions

1. **Clone the Repository**
  git clone https://github.com/bentonah/accessibility-tool.git
  cd accessibility-tool

2. **Install Backend Dependencies**
  cd backend
  npm install
  node server.js

3. **Install Frontend Depencies & Start App**
  cd frontend
  npm install
  npm start

4. **Open your browser to http://localhost:3000**

**Note:** The backend runs on port 4000, the frontend runs on port 3000.

**Note:** You must have both Node.js and npm installed for the tool to work.


## Key Design Decisions

- Puppeteer + axe-core chosen to analyze fully rendered pages instead of static HTML
- JWT authentication used for lightweight session management
- PDF export added to make reports shareable in professional workflows


## Future Improvements

- Deploy as a hosted SaaS tool
- Add CI/CD integration (scan sites automatically)
- Improve performance for large pages
- Add team-based reporting
