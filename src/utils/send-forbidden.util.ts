import { Context } from 'telegraf';

export async function sendForbidden(ctx: Context, asyaId: number): Promise<boolean> {
  if (ctx.from?.id !== Number(asyaId)) {
    await ctx.reply('<b>👀 Ты не Ася!</b>\n\n<i>🚫 Сюда можно только по спецпропуску.</i>', {
      parse_mode: 'HTML',
    });

    return false;
  }

  return true;
}
