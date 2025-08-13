const express = require('express');
const app = express();
const PORT = 3333;

app.get('/', (req, res) => {
  res.send('<h1>Express Server Working!</h1>');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Express server listening on http://127.0.0.1:${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});