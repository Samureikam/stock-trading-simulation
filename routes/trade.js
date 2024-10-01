const express = require("express");
const router = express.Router();
const authenticate = require("./auth").authenticate;
const stocks = require("./stocks").stocks;
const usersData = require("./auth").usersData;

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
router.get("/me", authenticate, (req, res) => {
  const user = req.user.name;
  const userData = getUserData(user, res);
  // populate the transactions with the current price of the stock
  userData.transactions = userData.transactions.map((tx) => {
    const stock = stocks.find((s) => s.name === tx.stock);
    return {
      ...tx,
      currentPrice: stock.price,
    };
  });
  if (userData) {
    res.json(userData);
  }
});

// Buy stocks, creating a new batch in the transaction history
router.post("/buy", authenticate, (req, res) => {
  const { stockId, amount } = req.body;
  const user = req.user.name;

  const stock = stocks.find((s) => s.id === stockId);
  if (!stock) return res.status(404).json({ message: "Stock not found" });

  const userData = getUserData(user, res);
  if (!userData) return;

  const cost = stock.price * amount;

  if (userData.capital >= cost) {
    userData.capital -= cost;
    userData.portfolio[stock.name] =
      (userData.portfolio[stock.name] || 0) + amount;

    // Add a new transaction (batch) to the user's transaction history
    userData.transactions.push({
      stock: stock.name,
      amount,
      initialAmount: amount,
      buyPrice: stock.price,
      sellPrice: null, // Not sold yet
      status: "open",
    });

    res.json({
      message: `Bought ${amount} of ${stock.name} at CHF ${stock.price}`,
      userData,
    });
  } else {
    res.status(400).json({ message: "Insufficient capital" });
  }
});

// Sell stocks, closing the oldest open transactions (FIFO)
router.post("/sell", authenticate, (req, res) => {
  const { stockId, amount } = req.body;
  const user = req.user.name;

  const stock = stocks.find((s) => s.id === stockId);
  if (!stock) return res.status(404).json({ message: "Stock not found" });

  const userData = getUserData(user, res);
  if (!userData) return;

  if (
    !userData.portfolio[stock.name] ||
    userData.portfolio[stock.name] < amount
  ) {
    return res.status(400).json({ message: "Insufficient stock holdings" });
  }

  let amountToSell = amount;
  let totalProfit = 0;

  // Iterate through open buy transactions in FIFO order and sell stocks
  for (let tx of userData.transactions) {
    if (tx.stock === stock.name && tx.status === "open" && amountToSell > 0) {
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

  userData.portfolio[stock.name] -= amount;
  userData.capital += totalProfit;

  res.json({
    message: `Sold ${amount} of ${stock.name} at CHF ${stock.price}`,
    userData,
  });
});

// Get the transaction history for the authenticated user
router.get("/transactions", authenticate, (req, res) => {
  const user = req.user.name;
  const userData = getUserData(user, res);
  if (userData) {
    res.json(userData.transactions);
  }
});

// Get the leaderboard of players' capital and portfolio
router.get("/players", authenticate, (req, res) => {
  const playersData = Object.keys(usersData).map((user) => ({
    user,
    capital: usersData[user].capital,
    portfolio: usersData[user].portfolio,
  }));
  res.json(playersData);
});

module.exports = router;
