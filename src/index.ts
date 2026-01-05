import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Gift, giftsTable, usersTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { sleep } from './utils/sleep.utilt';
import cron from 'node-cron';
import { calculateDailySpins } from './utils/calculate-daily-spins.util';
import { OpenRouter } from '@openrouter/sdk';

const app = express();
app.get('/', (_, res) => res.send('ok'));
app.listen(3000, () => {
  console.log('listening on port 3000');
});

const bot = new Telegraf(process.env.BOT_API_TOKEN as string);
const db = drizzle(process.env.DATABASE_URL!, {
  logger: true,
});

const openrouter = new OpenRouter({
  apiKey: process.env.AI_API_KEY,
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
        .values({ name: ctx.from.first_name, telegramId: ctx.from.id, userName: ctx.from.username })
        .returning();
    }

    await ctx.reply('🎰 Приветик! Жми /spin, чтобы крутить рулетку');
  } catch (error) {
    console.log('ERROR', error);
  }
});

bot.command('spin', async ctx => {
  try {
    // const msg = await ctx.reply('✨ Подожди секундочку…');
    // await sleep(1200);

    // await ctx.telegram.editMessageText(
    //   msg.chat.id,
    //   msg.message_id,
    //   undefined,
    //   '🙈 Я уже почти выбрал…',
    // );
    // await sleep(1400);

    // await ctx.telegram.editMessageText(
    //   msg.chat.id,
    //   msg.message_id,
    //   undefined,
    //   '💭 Интересно, что тебе попадётся…',
    // );
    // await sleep(1500);

    // await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, '🎁 Готово.');
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
    if (!prize) return await ctx.reply('✨ Сегодня сюрприз не нашёлся. Иногда так бывает.');

    await ctx.reply(
      `🎉 Поздравляю!!! Ты выиграла ${prize.name}! \n💋 За выдачей подарка обратитесь к Николаю - @saintLeroyalle`,
      { parse_mode: 'HTML' },
    );

    await db
      .update(usersTable)
      .set({ lastSpinAt: new Date() })
      .where(eq(usersTable.telegramId, ctx.from.id));

    if (prize.weight > 20) {
      await db
        .update(giftsTable)
        .set({ weight: prize.weight + 10 })
        .where(eq(giftsTable.id, prize.id));
    }
  } catch (error) {
    console.log('SPIN ERROR', error);
    return await ctx.reply('Что-то пошло не так! 🙁 Обратитесь к Николаю');
  }
});

cron.schedule('0 0 10 * * *', async () => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userName, 'saintLeroyalle'))
    .limit(1);

  if (!user) return;
  const spins = calculateDailySpins(user.lastSpinAt);
  if (!spins) return;

  if (spins === 1) {
    return await bot.telegram.sendMessage(
      user.telegramId,
      '🎀 У тебя сегодня есть попытка открыть подарок',
    );
  }

  await bot.telegram.sendMessage(user.telegramId, `🎀 У тебя ${spins} попыток открыть подарок`);
});

bot.launch();
