const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const moment = require("moment");
require("dotenv").config();  // Load environment variables

const app = express();
app.use(bodyParser.json());

// Load sensitive data from .env
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
console.log("OpenWeather API Key:", OPENWEATHER_API_KEY);
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Timeout configuration for axios requests
const axiosInstance = axios.create({
  timeout: 5000, // Set timeout of 5 seconds for requests
});

// Handle Dialogflow Requests
app.post("/webhook", async (req, res) => {
    const intent = req.body.queryResult.intent.displayName;
    const chatId = req.body.originalDetectIntentRequest?.payload?.data?.chat?.id; // Check if from Telegram
    const isTelegram = Boolean(chatId);

    try {
        // Welcome message and options
        if (intent === "Welcome Intent") {
            const welcomeMessage = `Hello! 👋 I'm your Personal Assistant. How can I help you today? 😊\n\n` +
                `I can assist you with the following tasks:\n` +
                `- 🌤️ Check the weather\n` +
                `- 🤣 Tell you a joke\n` +
                `- 📖 Get a Word of the Day\n` +
                `- 🎓 Learn a Fun Fact\n\n` +
                `Just tap any of the options below, and I'll get started! 💬`;


            if (isTelegram) {
                const telegramResponse = {
                    method: "sendMessage",
                    chat_id: chatId,
                    text: welcomeMessage,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Check Weather 🌤️", callback_data: "check_weather" }],
                            [{ text: "Tell a Joke 🤣", callback_data: "tell_joke" }],
                            [{ text: "Word of the Day 📖", callback_data: "word_of_the_day" }],
                            [{ text: "Fun Fact 🎓", callback_data: "fun_fact" }]
                        ]   
                        }
                };
                return res.json({ fulfillmentMessages: [{ payload: { telegram: telegramResponse } }] });
            }

            return res.json({ fulfillmentText: welcomeMessage });
        }

    
        // Handle Get Weather Intent
        if (intent === "get.weather") {
            const city = req.body.queryResult.parameters["geo-city"];
            console.log("Received City:", city);  // Log city parameter for debugging

            if (!city) {
                return res.json({ fulfillmentText: "Please provide a valid city name for weather information." });
            }

            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

            try {
                const response = await axiosInstance.get(url);
                console.log("Weather API Response Data:", response.data);  // Log entire API response

                if (response.data && response.data.main) {
                    const temp = response.data.main.temp;
                    const weatherMessage = `The temperature in ${city} is ${temp}°C.`;

                    if (isTelegram) {
                        const telegramResponse = {
                            method: "sendMessage",
                            chat_id: chatId,
                            text: weatherMessage,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Yes", callback_data: "weather_details" }],
                                    [{ text: "No", callback_data: "no_thanks" }]
                                ]
                            }
                        };
                        return res.json({ fulfillmentMessages: [{ payload: { telegram: telegramResponse } }] });
                    }

                    return res.json({ fulfillmentText: weatherMessage });
                } else {
                    console.error("Invalid weather data received:", response.data);
                    return res.json({ fulfillmentText: "An error occurred while fetching the weather. Please try again." });
                }
            } catch (error) {
                console.error("Error fetching weather data:", error.response ? error.response.data : error.message);
                return res.json({ fulfillmentText: "An error occurred while fetching the weather. Please try again." });
            }
        }

        // Handle Tell Joke Intent
        if (intent === "tell.joke") {
            const jokeUrl = `https://v2.jokeapi.dev/joke/Any`;
            try {
                const response = await axiosInstance.get(jokeUrl);
                const joke = response.data.joke || `${response.data.setup} - ${response.data.delivery}`;

                if (isTelegram) {
                    await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { // Use axios instance with timeout
                        chat_id: chatId,
                        text: joke
                    });
                    return res.sendStatus(200);
                }

                return res.json({ fulfillmentText: joke });
            } catch (error) {
                console.error("Error fetching joke:", error);
                return res.json({ fulfillmentText: "An error occurred while fetching a joke. Please try again." });
            }
        }

        // Handle Word of the Day Intent
        if (intent === "word.of.the.day") {
            const wordApiUrl = "https://random-word-api.herokuapp.com/word?number=1";
            try {
                const response = await axiosInstance.get(wordApiUrl);
                const word = response.data[0];
                const wordMessage = `📖 Word of the Day: *${word}*\n\nUse it in a sentence today! 😊`;

                if (isTelegram) {
                    await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { 
                        chat_id: chatId,
                        text: wordMessage,
                        parse_mode: "Markdown"
                    });
                    return res.sendStatus(200);
                }

                return res.json({ fulfillmentText: wordMessage });
            } catch (error) {
                console.error("Error fetching word of the day:", error);
                return res.json({ fulfillmentText: "Sorry, I couldn't fetch the word of the day. Try again later." });
            }
        }

        // Handle Fun Fact Intent
        if (intent === "fun.fact") {
            const factApiUrl = "https://uselessfacts.jsph.pl/random.json?language=en";
            try {
                const response = await axiosInstance.get(factApiUrl);
                const fact = response.data.text;
                const factMessage = `🎓 Did you know?\n\n${fact}`;

                if (isTelegram) {
                    await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { 
                        chat_id: chatId,
                        text: factMessage
                    });
                    return res.sendStatus(200);
                }

                return res.json({ fulfillmentText: factMessage });
            } catch (error) {
                console.error("Error fetching fun fact:", error);
                return res.json({ fulfillmentText: "Oops! Couldn't fetch a fun fact. Try again later." });
            }
        }

        return res.json({ fulfillmentText: "I'm not sure how to help with that!" });

    } catch (error) {
        console.error("Error processing request:", error);
        return res.json({ fulfillmentText: "An error occurred. Please try again." });
    }
});


// Handle Telegram Callback Queries
app.post("/telegramWebhook", async (req, res) => {
    const callbackQuery = req.body.callback_query;
    if (!callbackQuery) return res.sendStatus(400);

    const chatId = callbackQuery.message.chat.id;
    const callbackData = callbackQuery.data;

    let responseText = "I didn't understand that.";

    if (callbackData === "weather_details") {
        responseText = "Currently, I can only provide temperature. More details coming soon!";
    } 
    if (callbackData === "no_thanks" || callbackData === "stop") {
        responseText = "Okay! Let me know if you need anything else!";
    }

    await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { chat_id: chatId, text: responseText });
    return res.sendStatus(200);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
