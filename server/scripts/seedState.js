import { databaseFilePath, resetDatabase } from "../src/lib/db.js";

resetDatabase();
console.log(`GBF database reset at ${databaseFilePath}`);
