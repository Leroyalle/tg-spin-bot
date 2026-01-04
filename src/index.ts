import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';

const app = express();
const bot = new Telegraf(process.env.BOT_API_TOKEN as string);

bot.start(ctx => {
  ctx.reply('🎰 Привет! Жми /spin, чтобы крутить рулетку');
});

bot.command('spin', ctx => {
  ctx.reply('Рулетка крутится...');
});

app.get('/', (_, res) => res.send('ok'));

app.listen(3000, () => {
  console.log('listening on port 3000');
});

bot.launch();
