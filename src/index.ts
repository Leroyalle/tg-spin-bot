import 'dotenv/config';
import express from 'express';
import { Telegraf } from 'telegraf';
import { drizzle } from 'drizzle-orm/node-postgres';
import { dailyTextsTable, Gift, giftsTable, usersTable } from './db/schema';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import cron from 'node-cron';
import { calculateDailySpins } from './utils/calculate-daily-spins.util';
import { OpenRouter } from '@openrouter/sdk';
import { sleep } from './utils/sleep.utilt';
import { sendForbidden } from './utils/send-forbidden.util';

const app = express();
app.get('/', (_, res) => res.send('ok'));
app.use('/static', express.static('public'));
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

const asyaId = process.env.ASYA_ID as string;

bot.start(async ctx => {
  try {
    const result = await sendForbidden(ctx, Number(asyaId));
    if (!result) return;

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
    return await ctx.reply('Что-то пошло не так! 🙁 Обратитесь к Николаю');
  }
});

bot.command('spin', async ctx => {
  try {
    const result = await sendForbidden(ctx, Number(asyaId));
    if (!result) return;

    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, ctx.from.id))
      .limit(1);
    if (!user) {
      [user] = await db
        .insert(usersTable)
        .values({
          name: ctx.from.first_name,
          telegramId: ctx.from.id,
          userName: ctx.from.username,
        })
        .returning();
    }

    if (!user) return;

    if (calculateDailySpins(user?.lastSpinAt) === 0) {
      return await ctx.reply('🎀 Попытки на сегодня закончились. Увидимся завтра!');
    }

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

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      '🎁 Смотрим, что получилось…',
    );
    const gifts = await db.select().from(giftsTable);
    const weightedGifts = gifts.map(gift => ({
      ...gift,
      rollWeight: gift.coef * (1 / gift.weight),
    }));

    const sum = weightedGifts.reduce((acc, gift) => {
      acc += gift.rollWeight;
      return acc;
    }, 0);

    const randomInt = Math.random() * sum;

    let prize: Gift | null = null;
    let acc: number = 0;
    for (const gift of weightedGifts) {
      acc += gift.rollWeight;
      if (randomInt <= acc) {
        prize = gift;
        break;
      }
    }
    if (!prize || prize.type === 'nothing') {
      return await ctx.reply('✨ Сегодня сюрприз не нашёлся. Иногда так бывает.');
    }

    await ctx.reply(
      `🎉 Поздравляю!!! Ты выиграла <b>${prize.name.toUpperCase()}</b>! \n💋 За выдачей подарка обратитесь к Николаю - @saintLeroyalle`,
      { parse_mode: 'HTML' },
    );

    await db
      .update(usersTable)
      .set({ lastSpinAt: new Date() })
      .where(eq(usersTable.telegramId, ctx.from.id));

    if (prize.weight > 30) {
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
  try {
    const DAY = 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - DAY);

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userName, 'saintLeroyalle'))
      .limit(1);

    if (!user) return;

    const dailyTexts = await db
      .select()
      .from(dailyTextsTable)
      .where(
        and(
          eq(dailyTextsTable.isActive, true),
          or(isNull(dailyTextsTable.lastUsedAt), lt(dailyTextsTable.lastUsedAt, cutoff)),
        ),
      );
    if (!dailyTexts.length) return;

    const randomText = dailyTexts[Math.floor(Math.random() * dailyTexts.length)];

    if (!randomText) return;

    await db
      .update(dailyTextsTable)
      .set({ lastUsedAt: new Date() })
      .where(eq(dailyTextsTable.id, randomText.id));

    return await bot.telegram.sendMessage(
      user.telegramId,
      `Привет! Это ежедневное маленькое сообщение или напоминание для тебя, которое я подготовил заранее 🧡\n\n<b>${randomText.text}</b>`,
      { parse_mode: 'HTML' },
    );
  } catch (error) {
    console.log('CRON ERROR', error);
  }
});

cron.schedule('0 30 18 * * *', async () => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userName, 'asechx'))
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

    await bot.telegram.sendMessage(user.telegramId, `🎀 У тебя ${spins} попыток открыть подарок!`);
  } catch (error) {
    console.log('CRON ERROR', error);
  }
});

bot.launch();
