// Simple in-memory SSE broadcaster
const clients = new Set();

function sendEvent(res, eventName, data) {
  try {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  addClient(res) {
    // res should already have headers set
    clients.add(res);
    res.on('close', () => {
      clients.delete(res);
    });
  },
  broadcast(eventName, data) {
    for (const res of Array.from(clients)) {
      try {
        sendEvent(res, eventName, data);
      } catch (e) {
        try { res.end(); } catch (e) {}
        clients.delete(res);
      }
    }
  }
};