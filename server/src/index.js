import "dotenv/config";
import cors from "cors";
import express from "express";
import apiRouter from "./routes/api.js";
import { getDb } from "./lib/db.js";

const app = express();
const port = process.env.PORT || 4000;

getDb();

app.use(
  cors({
    origin: "*"
  })
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Global Green-Bond Fractionalizer API",
    version: "1.0.0",
    docs: {
      overview: "/api/overview",
      bonds: "/api/bonds",
      truthStream: "/api/truth-stream",
      transactions: "/api/transactions"
    }
  });
});

app.use("/api", apiRouter);

app.listen(port, () => {
  console.log(`GBF API listening on http://localhost:${port}`);
});
