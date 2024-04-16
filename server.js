// Load environment variables
require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const helmet = require('helmet'); // Security middleware
const compression = require('compression'); // Compression middleware
const authRoutes = require("./routes/authRoutes");
const voiceApiRouter = require('./routes/voiceApi'); // Added for voice API route
const morgan = require('morgan'); // Logging HTTP requests
const fs = require('fs'); // File system for logging
const path = require('path'); // Handling and transforming file paths
const https = require('https'); // HTTPS module
const winston = require('winston'); // Logging library

if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
  console.error("Error: config environment variables not set. Please create/edit .env configuration file.");
  process.exit(-1);
}

const app = express();
const port = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setting the templating engine to EJS
app.set("view engine", "ejs");

// Serve static files
app.use(express.static("public"));

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// HTTP request logging setup
const logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory); // Ensure log directory exists
const accessLogStream = fs.createWriteStream(path.join(logDirectory, 'serverLogs.txt'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// Database connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    logger.info("Database connected successfully");
  })
  .catch((err) => {
    logger.error(`Database connection error: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  });

// Session configuration with connect-mongo
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DATABASE_URL }),
  }),
);

app.on("error", (error) => {
  logger.error(`Server error: ${error.message}`);
  logger.error(error.stack);
});

// Logging session creation and destruction
app.use((req, res, next) => {
  const sess = req.session;
  // Make session available to all views
  res.locals.session = sess;
  if (!sess.views) {
    sess.views = 1;
    logger.info("Session created at: ", new Date().toISOString());
  } else {
    sess.views++;
    logger.info(
      `Session accessed again at: ${new Date().toISOString()}, Views: ${sess.views}, User ID: ${sess.userId || '(unauthenticated)'}`,
    );
  }
  next();
});

// Authentication Routes
app.use(authRoutes);

// Voice API Route
app.use(voiceApiRouter); // Using the voice API router

// Root path response
app.get("/", (req, res) => {
  res.render("index");
});

// If no routes handled the request, it's a 404
app.use((req, res, next) => {
  res.status(404).send("Page not found.");
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(`Unhandled application error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).send("There was an error serving your request.");
});

// HTTPS configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'cert', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'server.cert'))
};

https.createServer(httpsOptions, app).listen(port, () => {
  logger.info(`Server running at https://localhost:${port}`);
});