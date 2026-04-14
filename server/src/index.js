import { appConfig } from "./lib/env.js";
import { logEvent } from "./lib/logger.js";
import app from "./app.js";

const config = appConfig();

app.listen(config.port, () => {
  logEvent("info", "GBF API listening", {
    port: config.port,
    network: config.hederaNetwork
  });
});
