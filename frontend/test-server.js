const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Test Server Working!</h1><p>If you can see this, the connection is working.</p>');
});

const PORT = 3000;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Test server running at http://127.0.0.1:${PORT}/`);
  console.log('Try accessing this URL in your browser');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});