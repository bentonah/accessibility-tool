import React, { useState } from 'react';
import axios from 'axios';
import {
  Moon, Sun, FileWarning, Info, ShieldCheck, ChevronDown, ChevronRight,
  LogOut, Globe, LoaderCircle
} from 'lucide-react';
import jsPDF from 'jspdf';

// Main App Component
export default function App() {
  // --- Application State ---
  const [token, setToken] = useState(''); // Auth token from backend
  const [url, setUrl] = useState(''); // Website URL to analyze
  const [report, setReport] = useState(''); // Latest accessibility report
  const [authMode, setAuthMode] = useState('login'); // Toggle between login and register
  const [credentials, setCredentials] = useState({ username: '', password: '' }); // Login info
  const [darkMode, setDarkMode] = useState(false); // Dark mode toggle
  const [expandedSections, setExpandedSections] = useState([]); // Which violations are expanded
  const [tab, setTab] = useState('scan'); // Which view we're on (scan or history)
  const [history, setHistory] = useState([]); // Array of past scans
  const [loading, setLoading] = useState(false); // Loading spinner state
  const [error, setError] = useState(''); // Error messages for login/scan/etc.
  const [lastAction, setLastAction] = useState(''); // Used for retry logic (e.g., scan again)

  // Toggle expanding/collapsing report section
  const toggleSection = (i) => {
    setExpandedSections(prev =>
      prev.includes(i) ? prev.filter(index => index !== i) : [...prev, i]
    );
  };

  // Clears all state and logs user out
  const logout = () => {
    setToken('');
    setUrl('');
    setReport('');
    setExpandedSections([]);
    setTab('scan');
    setLastAction('');
  };

  // Login or register depending on mode
  const auth = async () => {
    setError('');
    setLastAction('auth');

    if (!credentials.username || !credentials.password) {
      setError('Please fill in both username and password.');
      return;
    }

    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await axios.post(`http://localhost:4000${endpoint}`, credentials);

      if (res.data.token) setToken(res.data.token);
      alert(res.data.message || 'Success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please try again.';
      setError(msg);
    }
  };

  // Sends the URL to the backend and triggers the accessibility scan
  const analyze = async () => {
    setError('');
    setLastAction('scan');

    if (!url.trim()) {
      setError('Please enter a URL to analyze.');
      return;
    }

    try {
      new URL(url.startsWith('http') ? url : 'https://' + url); // Basic format validation
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:4000/api/analyze', { url: formattedUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.data.report || res.data.report.trim() === '') {
        setError('Scan completed but no data was returned.');
        return;
      }

      setReport(res.data.report);
      setUrl(formattedUrl);
      const newScan = {
        url: formattedUrl,
        report: res.data.report,
        timestamp: new Date().toLocaleString()
      };
      setHistory(prev => [newScan, ...prev]);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setToken('');
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        setError('URL appears to be invalid or unreachable.');
      } else if (err.response?.status === 400 || err.response?.status === 404) {
        setError('Invalid or non-existent website URL.');
      } else {
        setError('Scan failed. Please check the URL and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Download the report in either TXT or PDF format
  const download = async (customReport = report, format = 'txt') => {
    if (format === 'pdf') {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Accessibility Report for ${url}`, 10, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Date: ${new Date().toLocaleString()}`, 10, y);
      y += 10;

      const lines = customReport.split(/(?=\n\d+\. )/);
      lines.forEach((block, i) => {
        const blockLines = block.trim().split('\n');
        if (blockLines.length < 2) return;

        const title = blockLines[0];
        const bodyLines = blockLines.slice(1);
        const impactLine = bodyLines.find(line => line.startsWith('  Impact:')) || '';
        const impact = impactLine.toLowerCase();
        let color = 'black';

        // Color-code headings by impact level
        if (impact.includes('serious')) color = 'red';
        else if (impact.includes('moderate')) color = 'blue';
        else if (impact.includes('minor') || impact.includes('low')) color = 'green';

        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.setTextColor(color);
        doc.text(`${i + 1}. ${title}`, 10, y);
        y += 7;

        doc.setFont(undefined, 'normal');
        doc.setTextColor('black');
        bodyLines.forEach((line) => {
          const splitLines = doc.splitTextToSize(line.trim(), pageWidth - 20);
          splitLines.forEach(subline => {
            if (y > 280) {
              doc.addPage();
              y = 20;
            }
            doc.text(subline, 10, y);
            y += 5;
          });
        });

        y += 5;
      });

      // Footer with user info
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Report downloaded by: ${credentials.username || 'Unknown'}`, 10, 285 - 4);
      doc.text('Report Generated by Accessibility Analyzer © Benton Hanson 2025', 10, 285);

      doc.save('accessibility_report.pdf');
    } else {
      // Plain .txt download fallback
      const blob = new Blob([customReport], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'accessibility_report.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Remove a scan from history after user confirms
  const deleteScan = (i) => {
    if (window.confirm('Are you sure you want to delete this scan?')) {
      setHistory(prev => prev.filter((_, index) => index !== i));
    }
  };

  // Switch view to an older scan and load it back into the report viewer
  const viewScan = (entry) => {
    setReport(entry.report);
    setUrl(entry.url);
    setTab('scan');
    setError('');
    setLastAction('');
  };

  // Converts raw report text into a styled, collapsible component list
  const formatReport = (text) => {
    return text.split(/(?=\n\d+\. )/).map((block, index) => {
      const lines = block.trim().split('\n');
      if (lines.length < 2) return null;

      const title = lines[0];
      const content = lines.slice(1);
      let impactLine = content.find(line => line.startsWith('  Impact:')) || '';
      let impactLevel = impactLine.split(':')[1]?.trim().toLowerCase();

      let icon = <Info className="inline w-4 h-4 mr-1" />;
      let impactColor = 'text-gray-900 dark:text-gray-100';

      // Change icon + color depending on severity
      if (impactLevel === 'serious') {
        impactColor = 'text-red-600 dark:text-red-400';
        icon = <FileWarning className="inline w-4 h-4 mr-1 text-red-600 dark:text-red-400" />;
      } else if (impactLevel === 'moderate') {
        impactColor = 'text-blue-600 dark:text-blue-300';
        icon = <Info className="inline w-4 h-4 mr-1 text-blue-600 dark:text-blue-300" />;
      } else if (impactLevel === 'minor' || impactLevel === 'low') {
        impactColor = 'text-green-600 dark:text-green-400';
        icon = <ShieldCheck className="inline w-4 h-4 mr-1 text-green-600 dark:text-green-400" />;
      }

      const expanded = expandedSections.includes(index);

      return (
        <div key={index} className="mb-4 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
          <button
            onClick={() => toggleSection(index)}
            className="flex items-center justify-between w-full px-4 py-2 text-left font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
            <span className="flex items-center gap-2">{icon}{title}</span>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4 text-sm font-mono space-y-1 text-gray-700 dark:text-gray-200">
              {content.map((line, i) => (
                <div key={i} className={line.includes('Impact:') ? impactColor : ''}>{line}</div>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // UI Rendering
  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-blue-100 text-gray-900'} min-h-screen font-sans transition-colors duration-300`}>
      {/* Header bar */}
      <div className="flex justify-between items-center px-6 pt-4">
        <div className="flex items-center gap-2 text-xl font-bold text-blue-700 dark:text-blue-300">
          <Globe className="w-6 h-6" /> Accessibility Tool
        </div>
        <div className="flex gap-4 items-center">
          {token && (
            <button onClick={logout} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
              <LogOut className="w-4 h-4" /> Logout
            </button>
          )}
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-2 text-sm">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* Main content container */}
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 my-6 space-y-6">
        {/* Error message display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
            {token && lastAction === 'scan' && (
              <button onClick={analyze} className="text-sm text-blue-700 underline ml-2">Try again</button>
            )}
          </div>
        )}

        {/* LOGIN/REGISTER SCREEN */}
        {!token ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">{authMode === 'login' ? 'Login' : 'Register'}</h1>
            <input className="border w-full p-2 rounded text-black" placeholder="Username"
              onChange={e => { setCredentials({ ...credentials, username: e.target.value }); setError(''); }} />
            <input className="border w-full p-2 rounded text-black" type="password" placeholder="Password"
              onChange={e => { setCredentials({ ...credentials, password: e.target.value }); setError(''); }} />
            <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded" onClick={auth}>Submit</button>
            <p className="text-sm text-center text-gray-600 dark:text-gray-300 cursor-pointer underline"
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}>
              Switch to {authMode === 'login' ? 'Register' : 'Login'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* === TAB SWITCHING === */}
            <div className="flex gap-4 mb-4">
              <button onClick={() => { setTab('scan'); setError(''); }} className={`px-4 py-2 rounded ${tab === 'scan' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>New Scan</button>
              <button onClick={() => { setTab('history'); setError(''); }} className={`px-4 py-2 rounded ${tab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Scan History</button>
            </div>

            {/* === NEW SCAN TAB === */}
            {tab === 'scan' && (
              <>
                <h1 className="text-2xl font-bold text-blue-700 dark:text-blue-300">Accessibility Analyzer</h1>
                <input className="border w-full p-2 rounded text-black truncate"
                  placeholder="Enter Website URL"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(''); }} />
                <div className="space-x-2 flex items-center">
                  <button disabled={loading} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded" onClick={analyze}>
                    {loading ? <span className="flex items-center"><LoaderCircle className="animate-spin mr-2 h-4 w-4" />Analyzing...</span> : 'Analyze'}
                  </button>
                  <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded" onClick={() => download(report, 'txt')}>Download TXT</button>
                  <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded" onClick={() => download(report, 'pdf')}>Download PDF</button>
                </div>
                {report && (
                  <div className="bg-gray-100 dark:bg-gray-700 border rounded p-4 overflow-x-auto">
                    {formatReport(report)}
                  </div>
                )}
              </>
            )}

            {/* === SCAN HISTORY TAB === */}
            {tab === 'history' && (
              <div className="space-y-4">
                {history.length === 0 ? <p>No scans yet.</p> : history.map((entry, i) => (
                  <div key={i} className="border rounded p-4 bg-gray-50 dark:bg-gray-700">
                    <p className="font-semibold truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-full">{entry.url}</p>
                    <p className="text-xs text-gray-500 mb-2">{entry.timestamp}</p>
                    <div className="flex gap-2">
                      <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => viewScan(entry)}>View</button>
                      <button className="bg-gray-600 text-white px-3 py-1 rounded" onClick={() => download(entry.report)}>Download TXT</button>
                      <button className="bg-purple-600 text-white px-3 py-1 rounded" onClick={() => download(entry.report, 'pdf')}>Download PDF</button>
                      <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={() => deleteScan(i)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 dark:text-gray-400 pb-4">
        © 2025 Benton Hanson. All rights reserved.
      </footer>
    </div>
  );
}