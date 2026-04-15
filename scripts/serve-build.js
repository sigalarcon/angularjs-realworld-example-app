/**
 * Simple static file server for the built frontend.
 * Serves files from ./build on port 4000.
 * Used for E2E testing after `gulp build` has been run.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;
const BUILD_DIR = path.join(__dirname, '..', 'build');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? 'index.html' : req.url.split('?')[0];
  let filePath = path.join(BUILD_DIR, urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(BUILD_DIR)) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  // If file doesn't exist, serve index.html (SPA fallback)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Static server running at http://localhost:${PORT}`);
  console.log(`Serving files from ${BUILD_DIR}`);
});
