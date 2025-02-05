const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const moment = require("moment");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = "8122699624:AAGzbcxSFlNLkhXjXDHet3o4bZPl-TZyH-Y";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

let reminders = {}; // Store reminders temporarily

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

        if (intent === "get.weather") {
            const city = req.body.queryResult.parameters["geo-city"];
            const apiKey = "092786ef252fe1d086bc770359983b5d";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

            const response = await axios.get(url);
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
        }

        if (intent === "get.news") {
            const newsUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=119403342e7749d4a381da4ccfbe2dc1`;
            const response = await axios.get(newsUrl);
            const headline = response.data.articles[0].title;
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
        }

        if (intent === "get.time.date") {
            const now = new Date();
            const timeMessage = `The current time is ${now.toLocaleTimeString()} and today is ${now.toDateString()}.`;

            if (isTelegram) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: timeMessage
                });
                return res.sendStatus(200);
            }

            return res.json({ fulfillmentText: timeMessage });
        }

        if (intent === "tell.joke") {
            const jokeUrl = `https://v2.jokeapi.dev/joke/Any`;
            const response = await axios.get(jokeUrl);
            const joke = response.data.joke || `${response.data.setup} - ${response.data.delivery}`;

            if (isTelegram) {
                await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                    chat_id: chatId,
                    text: joke
                });
                return res.sendStatus(200);
            }

            return res.json({ fulfillmentText: joke });
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
            const newsUrl = `https://newsapi.org/v2/top-headlines?country=us&apiKey=119403342e7749d4a381da4ccfbe2dc1`;
            const response = await axios.get(newsUrl);
            const moreNews = response.data.articles[1]?.title || "No more news available.";
            responseText = `Here's another news update: ${moreNews}`;
        } catch (error) {
            console.error("Error fetching more news:", error);
            responseText = "Sorry, I couldn't fetch more news.";
        }
    } 
    else if (callbackData === "no_thanks" || callbackData === "stop") {
        responseText = "Alright! Let me know if you need anything else.";
    }

    // Send response back to Telegram
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
        chat_id: chatId,
        text: responseText
    });

    res.sendStatus(200);
});

// Reminder Handler (send reminder when it's time)
setInterval(() => {
    const now = moment().format("YYYYMMDDHHmm");

    for (let reminderId in reminders) {
        const reminder = reminders[reminderId];

        if (moment(reminder.time).format("YYYYMMDDHHmm") === now) {
            axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
                chat_id: reminder.chatId,
                text: `⏰ Reminder: ${reminder.message}`
            });

            // Remove the reminder once sent
            delete reminders[reminderId];
        }
    }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
