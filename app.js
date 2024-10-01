const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();
const authRoutes = require("./routes/auth");
const stockRoutes = require("./routes/stocks");
const tradeRoutes = require("./routes/trade");

// Middleware
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/stocks", stockRoutes);
app.use("/trade", tradeRoutes);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
