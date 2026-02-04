import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { generateText } from "./ai.js";
import { validateGenerateRequest } from "./validate.js";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: true,
    credentials: false
  })
);

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.post("/generate", async (req, res) => {
  try {
    const payload = validateGenerateRequest(req.body);
    const result = await generateText(payload);
    res.json({ text: result.text });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error.";
    res.status(400).json({ error: message });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
