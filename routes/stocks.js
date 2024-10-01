const express = require("express");
const router = express.Router();
const authenticate = require("./auth").authenticate;

let stocks = [
  { id: 1, name: "Stock A", price: 100 },
  { id: 2, name: "Stock B", price: 150 },
  { id: 3, name: "Stock C", price: 200 },
  { id: 4, name: "Stock D", price: 250 },
  { id: 5, name: "Stock E", price: 300 },
];

// In-memory stock history
let stockHistory = [];

setInterval(() => {
  stocks.forEach((stock) => {
    const newPrice = Math.round(stock.price * (0.95 + Math.random() * 0.1));
    stock.price = newPrice;
    stockHistory.push({ ...stock, timestamp: new Date() });
  });
}, 1000); // Update stock prices every second

router.get("/", (req, res) => {
  res.json(stocks);
});

router.get("/history", (req, res) => {
  res.json(stockHistory);
});

module.exports = router;
module.exports.stocks = stocks;
