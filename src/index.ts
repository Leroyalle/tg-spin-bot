import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { drizzle } from 'drizzle-orm/node-postgres';
import { usersTable } from './db/schema';
import { eq } from 'drizzle-orm';

const app = express();
app.get('/', (_, res) => res.send('ok'));
app.listen(3000, () => {
  console.log('listening on port 3000');
});

const bot = new Telegraf(process.env.BOT_API_TOKEN as string);
const db = drizzle(process.env.DATABASE_URL!, {
  logger: true,
});

bot.start(async ctx => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);
    if (!user) {
      await db
        .insert(usersTable)
        .values({ name: ctx.from.first_name, telegramId: ctx.from.id })
        .returning();
    }
    ctx.reply('🎰 Привет! Жми /spin, чтобы крутить рулетку');
  } catch (error) {
    console.log('ERROR', error);
  }
});

bot.command('spin', ctx => {
  ctx.reply('Рулетка крутится...');
});

bot.launch();
