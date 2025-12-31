const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const axios = require("axios");

// Lost Ark API Base URL
const BASE_URL = 'https://developer-lostark.game.onstove.com';

/**
 * Proxy function to fetch character siblings
 * Usage: POST /getSiblings { characterName: "name", apiKey: "jwt" }
 */
exports.getSiblings = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const { characterName, apiKey } = req.body;

    if (!characterName || !apiKey) {
      return res.status(400).send('Missing characterName or apiKey');
    }

    try {
      const response = await axios.get(
        `${BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`,
        {
          headers: {
            'accept': 'application/json',
            'authorization': `bearer ${apiKey}`
          }
        }
      );

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Lost Ark API Error:", error.response?.data || error.message);
      
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res.status(500).send({ message: "Internal Server Error", error: error.message });
      }
    }
  });
});