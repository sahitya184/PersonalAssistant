**Personal Assistant Chatbot** 🤖

This is a Personal Assistant Chatbot built using Dialogflow ES and Node.js webhook. The bot provides various functionalities, including:

🌤️ Weather updates
🤣 Jokes
📖 Word of the Day
🎓 Fun Facts
The chatbot is integrated with Telegram and can also be tested on Dialogflow’s web demo.

🚀 ** Features**

✅ Get real-time weather updates 🌦️
✅ Receive random jokes for entertainment 😂
✅ Learn a new word every day 📚
✅ Discover fun and interesting facts 🎓
✅ Supports Telegram integration 📲

🛠️ **Technologies Used**

Dialogflow ES for NLP and Intent Management
Node.js & Express.js for webhook
Axios for API requests
OpenWeather API for weather data
Telegram Bot API for Telegram integration

**📂 Project Structure**

📂 my-chatbot  
 ┣ 📂 dialogflow-agent  # Dialogflow agent export  
 ┣ 📂 webhook           # Webhook server  
 ┃ ┣ 📄 index.js       # Main server file  
 ┃ ┣ 📄 package.json   # Node.js dependencies  
 ┃ ┣ 📄 .env           # API keys (DO NOT SHARE!)  
 ┃ ┣ 📄 README.md      # Project documentation
 
**🔧 Installation & Setup**

1️⃣ Clone the repository

git clone https://github.com/sahitya184/PersonalAssistant.git

2️⃣ Install dependencies

npm install

3️⃣ Configure Environment Variables

Create a .env file in the root directory and add:

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=5000

4️⃣ Start the webhook server

node index.js

5️⃣ Deploy Webhook

Use Render / Vercel / Railway for deployment

Register the webhook URL in Dialogflow

**💬 Usage**

Test via Dialogflow:

Go to Dialogflow Console
Open "Try it now" and type "What's the weather in New York?"
Test via Telegram:

Start your Telegram bot
Type "/start" and select options
