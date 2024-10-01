const express = require("express");
const router = express.Router();
const authenticate = require("./auth").authenticate;

/**
 * Market factors you can manage easily
 */
const marketEventMin = 10; // Minimum market event strength
const marketEventMax = 30; // Maximum market event strength
const meanPrice = 100; // Baseline price for mean reversion
const maxPriceChangePercent = 0.1; // Maximum price change in a single update (10% of current price)
const meanReversionRate = 0.05; // 5% pull towards the mean price each update
const momentumDecayMin = 0.85; // Minimum momentum decay factor (15%)
const momentumDecayMax = 0.95; // Maximum momentum decay factor (5%)
const slowingFactor = 0.3; // Slows down the price change by reducing its effect (set to 1 for normal speed)

let stocks = [
  {
    id: 1,
    name: "Stock A",
    price: 100,
    momentum: { amount: 0 },
    volatility: 2,
  },
  {
    id: 2,
    name: "Stock B",
    price: 100,
    momentum: { amount: 0 },
    volatility: 3,
  },
  {
    id: 3,
    name: "Stock C",
    price: 100,
    momentum: { amount: 0 },
    volatility: 2,
  },
  {
    id: 4,
    name: "Stock D",
    price: 100,
    momentum: { amount: 0 },
    volatility: 10,
  },
  {
    id: 5,
    name: "Stock E",
    price: 100,
    momentum: { amount: 0 },
    volatility: 1,
  },
];

// In-memory stock history
let stockHistory = [];

/**
 * Adjust momentum of a stock.
 * @param {Object} stock - The stock to adjust momentum for.
 * @param {number} amount - The amount of momentum to add or subtract.
 */
function adjustMomentum(stock, amount) {
  stock.momentum.amount += amount;
}

/**
 * Update stock prices every second, applying momentum, random fluctuation, and mean reversion.
 * All changes are scaled by the slowingFactor to reduce the magnitude of changes.
 */
function updateStockPrices() {
  stocks.forEach((stock) => {
    // Apply momentum as a percentage of the current stock price
    const randomFactor = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2
    const randomFluctuation =
      (((Math.random() - 0.5) * 2 * stock.volatility) / 100) *
      stock.price *
      slowingFactor; // Random fluctuation scaled by slowingFactor

    // Calculate momentum influence, scaled by slowingFactor
    let momentumInfluence =
      ((stock.price * stock.momentum.amount) / 100) *
      randomFactor *
      slowingFactor;

    // Cap the maximum price change to a percentage of the current price
    const maxChange = stock.price * maxPriceChangePercent;
    momentumInfluence = Math.max(
      -maxChange,
      Math.min(momentumInfluence, maxChange)
    ); // Cap influence

    // Apply mean reversion, scaled by slowingFactor
    const meanReversionInfluence =
      (meanPrice - stock.price) * meanReversionRate * slowingFactor;

    // Update the stock price with momentum influence, random fluctuation, and mean reversion
    stock.price = Math.max(
      10,
      Math.round(
        stock.price +
          momentumInfluence +
          randomFluctuation +
          meanReversionInfluence
      )
    );

    // Momentum decay - random decay factor between 5% and 15%, scaled by slowingFactor
    const randomDecay =
      momentumDecayMin + Math.random() * (momentumDecayMax - momentumDecayMin);
    stock.momentum.amount *= randomDecay * slowingFactor;

    // Log the updated stock price to history
    const { id, name, price } = stock;
    stockHistory.push({ id, name, price, timestamp: new Date() });
  });
}

/**
 * Randomly trigger a market event (crash or bubble) that impacts some stocks.
 */
function triggerMarketEvent() {
  const isCrash = Math.random() < 0.5;
  const eventType = isCrash ? "crash" : "bubble";
  const numStocksToAffect = Math.max(Math.floor(stocks.length * 0.6), 1); // At least 60% of stocks

  // Pick random stocks to be impacted
  const affectedStocks = [];

  while (affectedStocks.length < numStocksToAffect) {
    const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
    if (!affectedStocks.includes(randomStock)) {
      affectedStocks.push(randomStock);
    }
  }

  // Apply random momentum to affected stocks
  affectedStocks.forEach((stock) => {
    const eventStrength = isCrash
      ? -(marketEventMin + Math.random() * (marketEventMax - marketEventMin)) // Crash reduces price by marketEventMin% to 30%
      : marketEventMin + Math.random() * (marketEventMax - marketEventMin); // Bubble increases price by marketEventMin% to 30%
    adjustMomentum(stock, eventStrength); // Adjust momentum based on the event
  });

  console.log(`Market ${eventType} affecting ${affectedStocks.length} stocks!`);
}

// Update stock prices every second
setInterval(() => {
  updateStockPrices();
  if (
    Math.random() < 0.2 &&
    stocks.filter((s) => s.momentum.amount > marketEventMin).length == 0
  ) {
    // Very rare event
    triggerMarketEvent();
  }
}, 2000);


/**
 * @swagger
 * /stocks:
 *   get:
 *     summary: Get current stock prices
 *     tags: [Stocks]
 *     responses:
 *       200:
 *         description: Stock prices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 */
router.get("/", (req, res) => {
  const simplifiedStocks = stocks.map(({ id, name, price }) => ({
    id,
    name,
    price,
  }));
  res.json(simplifiedStocks);
});
/**
 * @swagger
 * /stocks/history:
 *   get:
 *     summary: Get stock price history
 *     tags: [Stocks]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     responses:
 *       200:
 *         description: Stock price history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       403:
 *         description: Token required
 *       401:
 *         description: Invalid token
 */
router.get("/history", (req, res) => {
  res.json(stockHistory);
});

module.exports = router;
module.exports.stocks = stocks;
