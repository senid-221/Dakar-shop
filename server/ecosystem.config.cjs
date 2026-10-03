// PM2 process definition for the Citymarket Dakar Node server.
// Start with:  pm2 start ecosystem.config.cjs --env production
// The app loads DATABASE_URL etc. from server/.env via Node's --env-file flag.
module.exports = {
  apps: [
    {
      name: "citymarket",
      script: "index.mjs",
      cwd: __dirname,
      node_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: "8080",
        HOST: "127.0.0.1",
      },
      error_file: "./pm2-error.log",
      out_file: "./pm2-out.log",
      time: true,
    },
  ],
};
