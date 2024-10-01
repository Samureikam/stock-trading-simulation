const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const router = express.Router();

const usersData = {};
const SECRET = "mysecret"; // Secret key for JWT

// In-memory user store
let users = []; // Array to store users with bcrypt-hashed passwords

// Registration route: Register a new user

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         password:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
router.post("/register", (req, res) => {
  const { name, password } = req.body;

  // Check if the user already exists
  const existingUser = users.find((user) => user.name === name);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password with a salt of 10

  // Store the user with the hashed password
  users.push({ name, password: hashedPassword });

  // Initialize user data for portfolio, transactions, etc.
  usersData[name] = { capital: 1000, portfolio: {}, transactions: [] };

  res.status(201).json({ message: "User registered successfully" });
});

// Login route: Authenticate the user and return a JWT token

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user and return a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", (req, res) => {
  const { name, password } = req.body;

  // Find the user in the in-memory user store
  const user = users.find((user) => user.name === name);
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Compare the provided password with the stored hashed password
  const passwordIsValid = bcrypt.compareSync(password, user.password);
  if (!passwordIsValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // If the password is valid, generate a JWT token
  const token = jwt.sign({ name }, SECRET, { expiresIn: "1h" });

  res.json({ token });
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

// Export the router and user data for other routes
module.exports = router;
module.exports.authenticate = authenticate;
module.exports.usersData = usersData;
