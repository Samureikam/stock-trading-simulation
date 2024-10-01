const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

const usersData = {};
const SECRET = "mysecret"; // Secret key for JWT

// In-memory user store for simplicity
let users = []; // bcrypt-hashed password for "password"

router.post("/login", (req, res) => {
  const { name, password } = req.body;

  if (password === "password") {
    const token = jwt.sign({ name }, SECRET, { expiresIn: "1h" });
    // Ensure user data is initialized during login (if it wasn't during registration)
    if (!usersData[name]) {
      usersData[name] = { capital: 1000, portfolio: {}, transactions: [] };
    }
    res.json({ token });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

// Middleware to protect routes
function authenticate(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("Token is required");

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Invalid token");
    req.user = decoded;
    next();
  });
}

module.exports = router;
module.exports.authenticate = authenticate;
module.exports.usersData = usersData;
