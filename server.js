require('dotenv').config();
const http = require('http');
const app = require("./app")
const port = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});
