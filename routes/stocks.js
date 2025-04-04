const express = require("express");
const router = express.Router();
const authenticate = require("./auth").authenticate;
const usersData = require("./auth").usersData;

/**
 * Market factors you can manage easily
 */
const marketEventMin = 30; // Minimum market event strength
const marketEventMax = 80; // Maximum market event strength
const meanPrice = 100; // Baseline price for mean reversion
const maxPriceChangePercent = 0.1; // Maximum price change in a single update (10% of current price)
const meanReversionRate = 0.05; // 5% pull towards the mean price each update
const momentumDecayMin = 0.6; // Minimum momentum decay factor (15%)
const momentumDecayMax = 0.8; // Maximum momentum decay factor (5%)
const slowingFactor = 0.3; // Slows down the price change by reducing its effect (set to 1 for normal speed)

const getRandomVolatility = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min * 2;

const eventTypeMessages = [
  "The market has witnessed a {eventType}, causing widespread concern.",
  "Experts are warning that a {eventType} is imminent, brace yourself!",
  "A sudden {eventType} has shaken the confidence of investors.",
  "Rumors of a {eventType} are spreading like wildfire in the market.",
  "Traders are scrambling to adjust as a {eventType} takes hold.",
  "A {eventType} has caused a massive sell-off in key stocks.",
  "The economy is showing signs of a {eventType}, disrupting normal trading.",
  "A {eventType} has triggered panic buying across sectors.",
  "This unexpected {eventType} has sent shockwaves through the market.",
  "Investors are reacting to the latest {eventType} with caution.",
  "The ongoing {eventType} is fueling market volatility.",
  "A {eventType} is brewing, leaving investors on edge.",
  "Reports of a {eventType} have caused a flurry of trading activity.",
  "The {eventType} has spurred a chain reaction of stock price fluctuations.",
  "A {eventType} is looming, and the market is struggling to stabilize.",
  "The market is reeling from the effects of a {eventType}.",
  "A massive {eventType} has thrown the market into chaos.",
  "There are signs of a {eventType}, pushing traders to make bold moves.",
  "The {eventType} has resulted in a surge of market speculation.",
  "A {eventType} has created opportunities for savvy traders to capitalize.",
];

let stocks = [
  {
    id: 1,
    name: "Byte Buffs Inc",
    price: 100,
    momentum: { amount: 0 },
    volatility: getRandomVolatility(7, 8), // Moderate volatility
  },
  {
    id: 2,
    name: "Algorithm Aces Ltd",
    price: 100,
    momentum: { amount: 0 },
    volatility: getRandomVolatility(10, 12), // Higher volatility
  },
  {
    id: 3,
    name: "Cyber Savants Corp",
    price: 100,
    momentum: { amount: 0 },
    volatility: getRandomVolatility(5, 6), // Lower volatility
  },
  {
    id: 4,
    name: "Data Dynamos Co",
    price: 100,
    momentum: { amount: 0 },
    volatility: getRandomVolatility(5, 10), // Moderate to high volatility
  },
  {
    id: 5,
    name: "Pixel Pioneers LLC",
    price: 100,
    momentum: { amount: 0 },
    volatility: getRandomVolatility(6, 7), // Moderate volatility
  },
];

// In-memory stock history
let stockHistory = [];
const marketEvents = [];

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
    stock.momentum.amount *= randomDecay;

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
  const randomMessage = eventTypeMessages[
    Math.floor(Math.random() * eventTypeMessages.length)
  ].replace("{eventType}", eventType);

  marketEvents.push({
    id: marketEvents.length,
    type: eventType,
    stocks: affectedStocks.map((s) => s.name),
    timestamp: new Date(),
    message: randomMessage,
  });
}

function updateAllPlayerPortfolios() {
  Object.keys(usersData).forEach((user) => {
    let userData = usersData[user];
    let portfolio = userData.portfolio;
    let capital = userData.capital;
    let totalValue = capital;
    for (let stock of stocks) {
      if (portfolio[stock.name]) {
        totalValue += stock.price * portfolio[stock.name];
      }
    }
    userData.history = userData.history || [];
    userData.history.push(totalValue);
    userData.currentValue = totalValue;
  });
}

// Update stock prices every second
setInterval(() => {
  updateStockPrices();
  updateAllPlayerPortfolios();
  if (
    Math.random() < 1 / 10 &&
    stocks.filter((s) => s.momentum.amount > 5).length == 0
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
  res.json(
    stockHistory.slice(stockHistory.length - 5 * 300, stockHistory.length - 1)
  );
  // res.json(stockHistory);
});

router.get("/events", (req, res) => {
  res.json(marketEvents.sort((a, b) => b.timestamp - a.timestamp));
});

module.exports = router;
module.exports.stocks = stocks;
module.exports.adjustMomentum = adjustMomentum;
