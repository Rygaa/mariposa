module.exports = {
    apps: [
        {
            name: "mariposa-backend",
            cwd: "./backend",
            script: "dist/index.js",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
            env: {
                NODE_ENV: "production",
                PORT: 8100,
            },
        },
        {
            name: "mariposa-frontend",
            cwd: "./frontend",
            script: "server.js",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: 8000,
            },
        },
    ],
};
