import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Gift, giftsTable, usersTable } from './db/schema';
import { eq } from 'drizzle-orm';
import { sleep } from './utils/sleep.utilts';
import cron from 'node-cron';

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
        .values({ name: ctx.from.first_name, telegramId: ctx.from.id, userName: ctx.from.username })
        .returning();
    }
    ctx.reply('🎰 Приветик! Жми /spin, чтобы крутить рулетку');
  } catch (error) {
    console.log('ERROR', error);
  }
});

bot.command('spin', async ctx => {
  try {
    const msg = await ctx.reply('✨ Подожди секундочку…');
    await sleep(1200);

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      '🙈 Я уже почти выбрал…',
    );
    await sleep(1400);

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      '💭 Интересно, что тебе попадётся…',
    );
    await sleep(1500);

    await ctx.telegram.editMessageText(msg.chat.id, msg.message_id, undefined, '🎁 Готово.');
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
    // if (!prize) return ctx.reply('Что-то пошло не так! 🙁 Обратитесь к Николаю');
    if (!prize) return await ctx.reply('✨ Сегодня сюрприз не нашёлся. Иногда так бывает.');

    ctx.reply(
      `Поздравляю!!! Ты выиграла ${prize.name}! 🎉 /br 💋 За выдачей подарка обратитесь к Николаю - @saintLeroyalle`,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    console.log('SPIN ERROR', error);
  }
});

cron.schedule('0 0 10 * * *', async () => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.userName, 'saintLeroyalle'))
    .limit(1);

  if (!user) return;

  await bot.telegram.sendMessage(user.telegramId, '🎀 У тебя сегодня есть попытка открыть подарок');
});

bot.launch();
