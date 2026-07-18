const PORT = process.env.PORT || 3000;
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send({
        status: "OK",
        message: "Server is running!"
    })
    logger.info(`Received ping from ${req.ip}. Responding with 200.`);
});

const server =app.listen(PORT, () => {
    logger.info(`Web server is running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please free the port or change the PORT environment variable.`);
  } else {
    logger.error('An error occurred on the server:', err.message);
  }
});