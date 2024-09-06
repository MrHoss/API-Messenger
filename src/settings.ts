import dotenv from "dotenv";

dotenv.config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : ".env"
});


export const activeModules = [
    'bwhatsapp'
];

export const databaseConfig = {
    define: {
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci"
    },
    dialect: process.env.DB_DIALECT || "mysql",
    timezone: "-03:00",
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    logging: false
}

export const serverConfig = {
    port: process.env.PORT || 8080,
    proxyPort: process.env.PROXY_PORT || 8080,
    hostname: process.env.HOSTNAME || "localhost",
    corsConfig: {
        credentials: true,
        origin: process.env.AUTHORIZED_URLS?.replace(/\[\]/g,"").split(",") || "*"
    }
}




