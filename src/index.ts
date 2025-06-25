import express from "express";
import urlRoutes from "./routes/url.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint for Railway
app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    message: "CuteLy URL Shortener API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use(urlRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
