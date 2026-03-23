import "dotenv/config";
import cors from "cors";
import express from "express";
import apiRouter from "./routes/api.js";
import authRouter from "./routes/auth.js";
import { getDb } from "./lib/db.js";
import { attachAuth } from "./middleware/auth.js";

const app = express();
const port = process.env.PORT || 4000;

getDb();

app.use(
  cors({
    origin: "*"
  })
);
app.use(express.json());
app.use(attachAuth);

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
app.use("/auth", authRouter);

app.listen(port, () => {
  console.log(`GBF API listening on http://localhost:${port}`);
});
