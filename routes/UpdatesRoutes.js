const express = require('express');
const router = express.Router();
const sse = require('../server/sse');

// Server-Sent Events stream to broadcast live updates to connected clients
router.get('/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': req.get('origin') || '*'
  });
  res.flushHeaders && res.flushHeaders();
  // send an initial keepalive
  res.write(': connected\n\n');
  sse.addClient(res);
});

module.exports = router;