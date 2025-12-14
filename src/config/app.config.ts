export default () => ({
  app: {
    name: process.env.APP_NAME,
    env: process.env.APP_ENV,
    port: Number(process.env.APP_PORT) || 3000,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
});
