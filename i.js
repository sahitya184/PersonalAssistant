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

let reminders = {}; // Store reminders temporarily

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
                `- 📰 Get the latest news\n` +
                `- 🤣 Tell you a joke\n` +
                `- ⏰ Set reminders\n` +
                `- 📅 Tell you the current date and time\n\n` +
                `Just tap any of the options below, and I'll get started! 💬`;

            if (isTelegram) {
                const telegramResponse = {
                    method: "sendMessage",
                    chat_id: chatId,
                    text: welcomeMessage,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "Check Weather 🌤️", callback_data: "check_weather" }],
                            [{ text: "Get News 📰", callback_data: "get_news" }],
                            [{ text: "Tell a Joke 🤣", callback_data: "tell_joke" }],
                            [{ text: "Set a Reminder ⏰", callback_data: "set_reminder" }],
                            [{ text: "Current Date & Time 📅", callback_data: "get_time_date" }]
                        ]
                    }
                };
                return res.json({ fulfillmentMessages: [{ payload: { telegram: telegramResponse } }] });
            }

            return res.json({ fulfillmentText: welcomeMessage });
        }

        // Handle Set Reminder Intent
        if (intent === "set.reminder") {
            const reminderTime = req.body.queryResult.parameters["date-time"];
            const reminderMessage = req.body.queryResult.parameters["reminder-message"];
            
            // Store the reminder
            const reminderId = `${chatId}-${moment(reminderTime).format("YYYYMMDDHHmm")}`;
            reminders[reminderId] = { time: reminderTime, message: reminderMessage, chatId };

            // Acknowledge the reminder
            const reminderConfirmation = `Reminder set for ${moment(reminderTime).format("MMMM Do YYYY, h:mm a")}: ${reminderMessage}`;

            if (isTelegram) {
                const telegramResponse = {
                    method: "sendMessage",
                    chat_id: chatId,
                    text: reminderConfirmation
                };
                return res.json({ fulfillmentMessages: [{ payload: { telegram: telegramResponse } }] });
            }

            return res.json({ fulfillmentText: reminderConfirmation });
        }

        // Handle Get Weather Intent
        if (intent === "get.weather") {
            const city = req.body.queryResult.parameters["geo-city"];
            console.log("City:", city);  // Log city parameter for debugging

            if (!city) {
                return res.json({ fulfillmentText: "Please provide a valid city name for weather information." });
            }

            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

            try {
                const response = await axiosInstance.get(url);
                console.log("City:", city);
                console.log("Temperature:", temp); 
                console.log("Weather API Response Data:", response.data);// Log the entire API response data

                if (response.data && response.data.main) {
                    const temp = response.data.main.temp;
                    const weatherMessage = `The temperature in ${city} is ${temp}°C. Would you like details?`;

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

        // Handle Get News Intent
        if (intent === "get.news") {
            const newsUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`;
            try {
                const response = await axiosInstance.get(newsUrl);
                const headline = response.data.articles[0]?.title || "No headlines available at the moment.";
                const newsMessage = `Here's the latest news: ${headline}. Want more?`;

                if (isTelegram) {
                    const telegramResponse = {
                        method: "sendMessage",
                        chat_id: chatId,
                        text: newsMessage,
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: "More News", callback_data: "more_news" }],
                                [{ text: "No", callback_data: "stop" }]
                            ]
                        }
                    };
                    return res.json({ fulfillmentMessages: [{ payload: { telegram: telegramResponse } }] });
                }

                return res.json({ fulfillmentText: newsMessage });
            } catch (error) {
                console.error("Error fetching news:", error);
                return res.json({ fulfillmentText: "An error occurred while fetching the news. Please try again." });
            }
        }

        // Handle Get Time & Date Intent
        if (intent === "get.time.date") {
            const now = new Date();
            const timeMessage = `The current time is ${now.toLocaleTimeString()} and today is ${now.toDateString()}.`;

            if (isTelegram) {
                await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { // Use axios instance with timeout
                    chat_id: chatId,
                    text: timeMessage
                });
                return res.sendStatus(200);
            }

            return res.json({ fulfillmentText: timeMessage });
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
    else if (callbackData === "more_news") {
        responseText = "Fetching more news...";

        // Example: Fetch another news headline dynamically
        try {
            const newsUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${NEWS_API_KEY}`;
            const response = await axiosInstance.get(newsUrl);
            const moreNews = response.data.articles[1]?.title || "No more news available.";
            responseText = `Here's another news update: ${moreNews}`;
        } catch (error) {
            console.error("Error fetching more news:", error);
            responseText = "Sorry, I couldn't fetch more news.";
        }
    } 
    else if (callbackData === "no_thanks" || callbackData === "stop") {
        responseText = "Okay! Let me know if you need anything else!";
    }

    await axiosInstance.post(`${TELEGRAM_API_URL}/sendMessage`, { chat_id: chatId, text: responseText });
    return res.sendStatus(200);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
