const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/auth");
const stockRoutes = require("./routes/stocks");
const tradeRoutes = require("./routes/trade");

const cors = require('cors'); // Import the CORS package

const app = express();

app.use(cors()); // Enable CORS for all routes

// Middleware to parse JSON bodies
app.use(express.json());
// Your existing routes and middleware...

// Swagger definition
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Stock Trading API",
    version: "1.0.0",
    description: "API for stock trading and user management",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      tokenAuth: {
        type: "apiKey",
        in: "header",
        name: "Authorization", // Custom header field, no "Bearer" prepended
      },
    },
  },
  security: [{ tokenAuth: [] }], // Apply globally or per endpoint
};

const options = {
  swaggerDefinition,
  apis: ["./routes/auth.js", "./routes/stocks.js", "./routes/trade.js"], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

// Serve Swagger docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/auth", authRoutes);
app.use("/stocks", stockRoutes);
app.use("/trade", tradeRoutes);

// Start the server
app.listen(3000, '0.0.0.0', () => {
  console.log("Server is running on http://localhost:3000");
  console.log("Swagger docs available at http://localhost:3000/docs");
});
