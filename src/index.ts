import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Gift, giftsTable, usersTable } from './db/schema';
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

bot.command('spin', async ctx => {
  ctx.reply('Рулетка крутится...');
  const gifts = await db.select().from(giftsTable);
  const reversedWeight = gifts.map(gift => {
    return {
      ...gift,
      weight: 1 / gift.weight,
    };
  });

  const sum = reversedWeight.reduce((acc, gift) => {
    acc += gift.weight;
    return acc;
  }, 0);

  const randomInt = Math.random() * sum;

  let prize: Gift | null = null;
  let acc: number = 0;
  for (const gift of reversedWeight) {
    acc += gift.weight;
    if (randomInt <= acc) {
      prize = gift;
      break;
    }
  }
  if (!prize) return ctx.reply('Что-то пошло не так');
  ctx.reply(`Поздравляю! Ты выиграла ${prize.name}! 🎉`);
});

bot.launch();
