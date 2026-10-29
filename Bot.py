
import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()
WEBAPP_URL = os.getenv("WEBAPP_URL", "").strip()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("runex")


def build_keyboard():
    buttons = []

    if WEBAPP_URL.startswith("https://"):
        buttons.append([
            InlineKeyboardButton(
                text="🎮 PLAY RUNEX",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        ])

    buttons.append([
        InlineKeyboardButton(
            text="ℹ️ About RUNEX",
            callback_data="about",
        )
    ])

    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def main():
    if not BOT_TOKEN:
        raise RuntimeError(
            "Set BOT_TOKEN in your environment variables."
        )

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(
            parse_mode=ParseMode.HTML
        ),
    )
    dp = Dispatcher()

    @dp.message(CommandStart())
    async def start(message: Message):
        await message.answer(
            "<b>RUNEX GAME</b>\n\n"
            "Your game. Your rules.\n\n"
            "Welcome to RUNEX, a new gaming experience "
            "built for Telegram.\n\n"
            "Launch the app below and explore the demo.",
            reply_markup=build_keyboard(),
        )

    @dp.callback_query(lambda query: query.data == "about")
    async def about(query):
        await query.answer()
        await query.message.answer(
            "<b>RUNEX GAME</b>\n\n"
            "Explore games, track your stats, and level up. "
            "The current version uses virtual demo coins only."
        )

    await bot.set_my_commands([
        BotCommand(command="start", description="Open RUNEX GAME"),
    ])

    try:
        logger.info("RUNEX bot is starting")
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
