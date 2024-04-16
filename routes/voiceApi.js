const express = require('express');
const axios = require('axios');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const logger = require('../config/logger'); // Import the logger

// API URLs from environment variables
const whisperApiUrl = process.env.WHISPER_API_URL; // Use environment variable for Whisper API URL
const geminiApiUrl = process.env.GEMINI_API_URL; // Use environment variable for Gemini 1.5 Pro API URL
const labsApiUrl = process.env.LABS_API_URL; // Use environment variable for 11Labs API URL

// API Keys from environment variables
const whisperApiKey = process.env.WHISPER_API_KEY; // Ensure this is set in your .env file
const geminiApiKey = process.env.GEMINI_PRO_API_KEY; // Ensure this is set in your .env file
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY; // Ensure this is set in your .env file

router.post('/api/voice', upload.single('voiceInput'), async (req, res) => {
  if (!req.file) {
    logger.error('No file uploaded.');
    return res.status(400).send('No file uploaded.');
  }
  try {
    // Convert voice to text using Whisper Small.en
    const whisperResponse = await axios.post(`${whisperApiUrl}/convert`, req.file.buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Authorization': `Bearer ${whisperApiKey}`
      },
    });
    const textInput = whisperResponse.data.text;

    logger.info('Voice converted to text successfully.');

    // Send text to Gemini 1.5 Pro and get a response
    const geminiResponse = await axios.post(`${geminiApiUrl}/process`, { prompt: textInput }, {
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`
      }
    });
    const textResponse = geminiResponse.data.text;

    logger.info('Text processed by Gemini 1.5 Pro successfully.');

    // Convert text response back to voice using 11Labs
    const labsResponse = await axios.post(`${labsApiUrl}/synthesize`, { text: textResponse }, {
      headers: {
        'Authorization': `Bearer ${elevenLabsApiKey}`
      },
      responseType: 'arraybuffer',
    });

    logger.info('Text converted back to voice successfully.');

    // Return the synthesized speech audio back to the frontend
    res.type('audio/mpeg');
    res.send(labsResponse.data);
  } catch (error) {
    logger.error('Voice API processing error: ' + error.message);
    logger.error(error.stack);
    res.status(500).send('Failed to process voice input.');
  }
});

module.exports = router;