const express = require("express");
const router = express.Router();
const authenticate = require("./auth").authenticate;
const stocks = require("./stocks").stocks;
const adjustMomentum = require("./stocks").adjustMomentum;
const usersData = require("./auth").usersData;

const buySellEffect = 0;

// Helper function to get user data safely, returning an error if not found
function getUserData(user, res) {
  const userData = usersData[user];
  if (!userData) {
    res
      .status(400)
      .json({ message: "User data not found. Please log in again." });
    return null;
  }
  return userData;
}


// Get user portfolio and capital
/**
 * @swagger
 * /trade/me:
 *   get:
 *     summary: Get current user's data with stock transactions and their current price
 *     tags: [Trade]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     responses:
 *       200:
 *         description: User data retrieved successfully with current stock prices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 capital:
 *                   type: number
 *                 portfolio:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       403:
 *         description: Token required
 *       401:
 *         description: Invalid token
 */
router.get("/me", authenticate, (req, res) => {
  const user = req.user.name;
  const userData = getUserData(user, res);
  // populate the transactions with the current price of the stock
  userData.transactions = userData.transactions.map((tx) => {
    const stock = stocks.find((s) => s.name === tx.stock.name);
    return {
      ...tx,
      currentPrice: stock.price,
    };
  });
  // calculate the actual portfolio value of a user
  userData.portfolioValue = Object.keys(userData.portfolio).reduce(
    (total, stockName) => {
      const stock = stocks.find((s) => s.name === stockName);
      return total + stock.price * userData.portfolio[stockName];
    },
    userData.capital
  );
  if (userData) {
    res.json(userData);
  }
});

// Buy stocks, creating a new batch in the transaction history
/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         stock:
 *           type: string
 *         amount:
 *           type: integer
 *         buyPrice:
 *           type: number
 *         sellPrice:
 *           type: number
 *         status:
 *           type: string
 */

/**
 * @swagger
 * /trade/buy:
 *   post:
 *     summary: Buy a stock
 *     tags: [Trade]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stockId:
 *                 type: integer
 *               amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stock bought successfully
 *       400:
 *         description: Stock not found or insufficient capital
 */
router.post("/buy", authenticate, (req, res) => {
  const { stockId, amount } = req.body;
  const user = req.user.name;

  const stock = stocks.find((s) => s.id === stockId);
  if (!stock) return res.status(404).json({ message: "Stock not found" });

  const userData = getUserData(user, res);
  if (!userData) return;

  let cost = stock.price * amount;

  // If the user doesn't have enough capital, buy as many as possible
  let actualAmount = amount;
  if (userData.capital < cost) {
    actualAmount = Math.floor(userData.capital / stock.price);
    cost = stock.price * actualAmount;
  }

  if (actualAmount > 0) {
    userData.capital -= cost;
    userData.portfolio[stock.name] =
      (userData.portfolio[stock.name] || 0) + actualAmount;

    // Add a new transaction (batch) to the user's transaction history
    userData.transactions.push({
      stock: stock,
      amount: actualAmount,
      initialAmount: actualAmount,
      buyPrice: stock.price,
      sellPrice: null, // Not sold yet
      status: "open",
    });

    adjustMomentum(stock, actualAmount * buySellEffect);

    res.json({
      message: `Bought ${actualAmount} of ${stock.name} at CHF ${stock.price}`,
      userData,
    });
  } else {
    res.status(400).json({ message: "Insufficient capital to buy any stocks" });
  }
});

// Sell stocks, closing the oldest open transactions (FIFO)
/**
 * @swagger
 * /trade/sell:
 *   post:
 *     summary: Sell a stock
 *     tags: [Trade]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stockId:
 *                 type: integer
 *               amount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stock sold successfully
 *       400:
 *         description: Stock not found or insufficient stock holdings
 */
router.post("/sell", authenticate, (req, res) => {
  const { stockId, amount } = req.body;
  const user = req.user.name;

  const stock = stocks.find((s) => s.id === stockId);
  if (!stock) return res.status(404).json({ message: "Stock not found" });

  const userData = getUserData(user, res);
  if (!userData) return;

  const availableAmount = userData.portfolio[stock.name] || 0;
  let amountToSell = Math.min(amount, availableAmount);
  let initialAmountToSell = amountToSell;

  if (amountToSell === 0) {
    return res.status(400).json({ message: "Insufficient stock holdings" });
  }

  let totalProfit = 0;

  // Iterate through open buy transactions in FIFO order and sell stocks
  for (let tx of userData.transactions) {
    if (
      tx.stock.name === stock.name &&
      tx.status === "open" &&
      amountToSell > 0
    ) {
      const sellAmount = Math.min(tx.amount, amountToSell); // Sell as much as possible from this batch
      const profit = sellAmount * stock.price;

      // Update the transaction: reduce the unsold amount or close it if fully sold
      tx.amount -= sellAmount;
      if (tx.amount === 0) {
        tx.sellPrice = stock.price; // Assign sell price
        tx.status = "closed"; // Mark as closed
      }

      totalProfit += profit;
      amountToSell -= sellAmount;
    }
  }

  userData.portfolio[stock.name] -= initialAmountToSell;
  userData.capital += totalProfit;

  adjustMomentum(stock, -initialAmountToSell * buySellEffect);

  res.json({
    message: `Sold ${initialAmountToSell} of ${stock.name} at CHF ${stock.price}`,
    userData,
  });
});

// Get the transaction history for the authenticated user
/**
 * @swagger
 * /trade/transactions:
 *   get:
 *     summary: Get the transaction history for the authenticated user
 *     tags: [Trade]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       403:
 *         description: Token required
 */
router.get("/transactions", authenticate, (req, res) => {
  const user = req.user.name;
  const userData = getUserData(user, res);
  if (userData) {
    res.json(userData.transactions);
  }
});

// Get the leaderboard of players' capital and portfolio
/**
 * @swagger
 * /trade/players:
 *   get:
 *     summary: Get capital and portfolio information of all players
 *     tags: [Trade]
 *     security:
 *       - tokenAuth: []  # Custom auth using token only
 *     responses:
 *       200:
 *         description: Players' capital and portfolio information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user:
 *                     type: string
 *                   capital:
 *                     type: number
 *                   portfolio:
 *                     type: object
 *                     additionalProperties:
 *                       type: integer
 */
router.get("/players", (req, res) => {
  const playersData = Object.keys(usersData).map((user) => ({
    user,
    capital: usersData[user].capital,
    portfolio: usersData[user].portfolio,
    portfolioValue: Object.keys(usersData[user].portfolio).reduce(
      (total, stockName) => {
        const stock = stocks.find((s) => s.name === stockName);
        return total + stock.price * usersData[user].portfolio[stockName];
      },
      usersData[user].capital
    ),
  }));
  playersData.sort((a, b) => b.portfolioValue - a.portfolioValue);
  res.json(playersData);
});

module.exports = router;
