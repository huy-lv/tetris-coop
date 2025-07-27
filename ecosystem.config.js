module.exports = {
  apps: [
    {
      name: "tetris-server",
      script: "./server/index.js",
      cwd: "/app",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
    {
      name: "tetris-client",
      script: "./static-server.js",
      cwd: "/app",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
