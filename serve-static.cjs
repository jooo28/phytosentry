const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, 'frontend', 'dist');
const preferredPort = Number(process.env.PORT || 5173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

function makeServer() {
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(root, 'index.html'), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not found: frontend/dist/index.html missing');
            return;
          }
          res.writeHead(200, {'Content-Type': types['.html']});
          res.end(html);
        });
        return;
      }

      res.writeHead(200, {'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream'});
      res.end(data);
    });
  });
}

function listenOn(port) {
  const server = makeServer();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use. Trying ${port + 1}...`);
      listenOn(port + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log('');
    console.log('================================');
    console.log('PhytoSentry Frontend is running');
    console.log('================================');
    console.log(`Local:   http://localhost:${port}/`);
    console.log('');
    console.log('Copy the Local URL and paste it into your browser.');
    console.log('Keep this frontend window open.');
    console.log('');
  });
}

listenOn(preferredPort);
