// Imports the necessary libraries
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create an Express app
const app = express();
const PORT = 4000;
const SECRET = 'your_secret_key'; // Secret key for JWTs (should be stored securely in production)

app.use(cors()); // Allow requests from frontend
app.use(bodyParser.json()); // Parse JSON bodies from requests

// Simple in-memory store for user accounts (resets when server restarts)
const users = {};

// Allows a new user to create an account
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  // Check if user already exists
  if (users[username]) return res.status(400).json({ message: 'User already exists' });

  // Otherwise, add user to the in-memory store
  users[username] = { password };
  res.json({ message: 'Registered successfully' });
});

// Verifies credentials and returns a JWT token
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];

  // Check if user exists and password matches
  if (!user || user.password !== password)
    return res.status(401).json({ message: 'Invalid credentials' });

  // Generate and return a token
  const token = jwt.sign({ username }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Protects private routes by checking the token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ message: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET); // Decode token
    next();
  } catch {
    res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// Launches Puppeteer, injects Axe, and runs the scan
app.post('/api/analyze', authenticate, async (req, res) => {
  const { url } = req.body;

  try {
    const browser = await puppeteer.launch(); // Start browser
    const page = await browser.newPage();

    await page.goto(url); // Navigate to target page
    await page.addScriptTag({ path: require.resolve('axe-core') }); // Inject axe

    // Run axe and grab results
    const results = await page.evaluate(async () => await window.axe.run());
    await browser.close(); // Clean up

    // Format the violations into a plain text report
    const report = `Accessibility Report for ${url}\n\n` + results.violations.map((v, i) => {
      return `${i + 1}. ${v.help} (${v.id})\n  Description: ${v.description}\n  Impact: ${v.impact}\n  Tags: ${v.tags.join(', ')}\n  Fix: ${v.helpUrl}\n`;
    }).join('\n');

    // Save it to a user-specific file
    const filePath = path.join(__dirname, 'reports', `${req.user.username}_report.txt`);
    fs.writeFileSync(filePath, report);

    res.json({ report }); // Send report to frontend
  } catch (err) {
    // Something went wrong (bad URL, puppeteer crash, etc.)
    res.status(500).json({ message: 'Analysis failed', error: err.message });
  }
});

// Sends the last report file as a download
app.get('/api/report', authenticate, (req, res) => {
  const filePath = path.join(__dirname, 'reports', `${req.user.username}_report.txt`);

  if (fs.existsSync(filePath)) {
    res.download(filePath); // Trigger download if file exists
  } else {
    res.status(404).json({ message: 'No report found for this user' });
  }
});

// Create the "reports" folder if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir);

// Start server on port 4000
app.listen(PORT, () => console.log(`Server is up at http://localhost:${PORT}`));