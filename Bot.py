
import os
import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEB_APP_URL = "https://deadruke.github.io/runex-game/"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[
        InlineKeyboardButton(
            text="🎮 Играть в RUNEX GAME",
            web_app=WebAppInfo(url=WEB_APP_URL)
        )
    ]]

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        "🚀 Добро пожаловать в RUNEX GAME!\n\n"
        "Выбирай режим, играй и проверяй свою удачу.\n"
        "Сейчас доступен деморежим с виртуальными монетами.",
        reply_markup=reply_markup
    )


def main():
    if not BOT_TOKEN:
        raise RuntimeError(
            "Не задан BOT_TOKEN. Добавь токен бота в переменные окружения."
        )

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))

    logging.info("RUNEX GAME bot is starting")
    app.run_polling()


if __name__ == "__main__":
    main()
