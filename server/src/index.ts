import "dotenv/config";
import express from "express";
import cors from "cors";
import { competitorsRouter } from "./routes/competitors";
import { productsRouter } from "./routes/products";
import { alertsRouter } from "./routes/alerts";
import { offersRouter } from "./routes/offers";
import { scrapeRouter } from "./routes/scrape";
import { discoveryRouter } from "./routes/discovery";
import { startScrapeCron } from "./cron";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin.split(",") }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/competitors", competitorsRouter);
app.use("/api/products", productsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/offers", offersRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/discovered-sailings", discoveryRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Competitor tracker API listening on port ${port}`);
  startScrapeCron();
});
