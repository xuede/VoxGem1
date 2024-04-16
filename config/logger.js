const winston = require('winston');
const path = require('path');

// Create a logger instance with custom settings
const logger = winston.createLogger({
  // Define the levels of logs and their corresponding colors
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // To log the full stack trace
    winston.format.splat(),
    winston.format.json()
  ),
  // Define different transports for logging
  transports: [
    // Console transport for logging to the console
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport for logging errors to 'error.log'
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error'
    }),
    // File transport for logging all logs to 'combined.log'
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'combined.log')
    })
  ],
  // Exception handling with a dedicated file transport
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'exceptions.log')
    })
  ],
  // In case of unhandled rejections, log them as exceptions
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'rejections.log')
    })
  ]
});

module.exports = logger;