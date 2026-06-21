require("dotenv").config();

const app = require("./api/index");
const preferredPort = Number(process.env.PORT || 3000);

function listen(port) {
  const server = app.listen(port, () => {
    console.log(`Spice Haven template running at http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !process.env.PORT) {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      listen(port + 1);
      return;
    }
    throw error;
  });
}

listen(preferredPort);
