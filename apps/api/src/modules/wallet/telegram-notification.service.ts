import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentRequest } from '../../database/entities/payment-request.entity';

export type PaymentNotificationEvent =
  | 'DEPOSIT_CREATED'
  | 'DEPOSIT_PROOF_SUBMITTED'
  | 'WITHDRAWAL_CREATED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'REQUEST_CANCELLED'
  | 'REQUEST_EXPIRED';

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  constructor(private readonly dataSource: DataSource) { }

  private escapeHtml(str?: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private extractReceiptUrl(text?: string, ref?: string): string | null {
    if (text) {
      const match = text.match(/https?:\/\/[^\s]+/i);
      if (match) return match[0].replace(/[.,;)]+$/, '');
    }
    if (ref && /^[A-Z0-9]{8,16}$/i.test(ref.trim())) {
      return `https://transactioninfo.ethiotelecom.et/receipt/${ref.trim().toUpperCase()}`;
    }
    return null;
  }

  /**
   * Retrieves all Telegram chat IDs that should receive payment notifications.
   */
  async getTargetChatIds(): Promise<{ chatId: string; username?: string }[]> {
    const targets: { chatId: string; username?: string }[] = [];
    const seenChats = new Set<string>();

    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return [];

    // 1. Static fallback from .env if provided (supports multiple comma-separated IDs or @channel handles)
    const envChatIds = (process.env['TELEGRAM_ADMIN_CHAT_ID'] || '')
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const cId of envChatIds) {
      if (!seenChats.has(cId)) {
        targets.push({ chatId: cId, username: cId.startsWith('@') ? cId : 'EnvAdmin' });
        seenChats.add(cId);
      }
    }

    // 2. Extra designated targets/channels (e.g. @Fastkenosupportteam)
    const extraTargetsRaw = process.env['TELEGRAM_NOTIFICATION_TARGETS'] || '@Fastkenosupportteam';
    const extraTargets = extraTargetsRaw
      .split(/[,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    for (const eTarget of extraTargets) {
      if (!seenChats.has(eTarget)) {
        targets.push({ chatId: eTarget, username: eTarget });
        seenChats.add(eTarget);
      }
    }

    try {
      // 2. Check if specific admin phones/usernames are designated in .env
      const phoneFilterRaw = process.env['TELEGRAM_NOTIFICATION_PHONES'];
      const designatedPhones = (phoneFilterRaw || '')
        .split(/[,;\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      let query = `
        SELECT "telegramChatId", "phone", "username", "roles"
        FROM "users"
        WHERE "telegramChatId" IS NOT NULL
      `;
      const params: any[] = [];

      const searchUsernames = [...designatedPhones, 'Fastkenosupportteam', '@Fastkenosupportteam'];
      if (designatedPhones.length > 0) {
        query += ` AND ("phone" = ANY($1) OR "username" = ANY($1) OR LOWER("username") = LOWER('Fastkenosupportteam'))`;
        params.push(searchUsernames);
      } else {
        query += ` AND (LOWER("username") = LOWER('Fastkenosupportteam') OR "roles"::text ILIKE '%CREATOR%' OR "roles"::text ILIKE '%OPERATOR%' OR "roles"::text ILIKE '%BUSINESS_OWNER%' OR "roles"::text ILIKE '%SUPER_ADMIN%')`;
      }

      const rows: any[] = await this.dataSource.query(query, params);

      for (const row of rows) {
        const chatId = String(row.telegramChatId).trim();
        if (chatId && !seenChats.has(chatId)) {
          // If no specific phones designated, notify staff roles
          if (designatedPhones.length === 0) {
            const rolesStr = Array.isArray(row.roles) ? row.roles.join(',') : String(row.roles || '');
            const isStaff = /CREATOR|BUSINESS_OWNER|SUPER_ADMIN|OPERATOR|FINANCE/i.test(rolesStr);
            if (!isStaff) continue;
          }
          targets.push({ chatId, username: row.username || row.phone });
          seenChats.add(chatId);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not query Telegram notification targets: ${err.message}`);
    }

    return targets;
  }

  /**
   * Dispatches a payment notification to all authorized administrators on Telegram.
   */
  async notify(
    request: PaymentRequest,
    event: PaymentNotificationEvent,
    extra?: { approverId?: string; note?: string },
  ): Promise<void> {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return;

    // Fetch player user details
    let player: { phone?: string; username?: string } = {};
    try {
      const pRows: any[] = await this.dataSource.query(
        `SELECT "phone", "username" FROM "users" WHERE "id"::text = $1 LIMIT 1`,
        [request.userId],
      );
      if (pRows && pRows[0]) {
        player = pRows[0];
      }
    } catch (e: any) {
      this.logger.warn(`Could not fetch player details: ${e.message}`);
    }

    // Fetch approver details if applicable
    let approverInfo = 'Staff Operator';
    if (extra?.approverId) {
      if (extra.approverId === '00000000-0000-0000-0000-000000000000') {
        approverInfo = '🤖 MacroDroid SMS Auto-Matching Engine';
      } else {
        try {
          const aRows: any[] = await this.dataSource.query(
            `SELECT "phone", "username", "roles" FROM "users" WHERE "id"::text = $1 LIMIT 1`,
            [extra.approverId],
          );
          if (aRows && aRows[0]) {
            const u = aRows[0];
            approverInfo = u.phone ? `${u.username || 'Staff'} (${u.phone})` : u.username || 'Staff';
          }
        } catch {
          // ignore
        }
      }
    }

    const amountFormatted = `${(Number(request.amountMinor) / 100).toFixed(2)} ${request.currency || 'ETB'}`;
    const receiptUrl = this.extractReceiptUrl(request.rawSmsText, request.transactionReference);
    const timeStr = new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' });

    let messageHtml = '';

    switch (event) {
      case 'DEPOSIT_CREATED':
        messageHtml =
          `🔔 <b>NEW DEPOSIT REQUEST INITIATED</b> 💰\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          `🏦 <b>Provider:</b> ${this.escapeHtml((request.paymentMethod || 'TELEBIRR').toUpperCase())}\n` +
          `🎯 <b>Target Account:</b> <code>${this.escapeHtml(request.accountNumber || '—')}</code>\n` +
          (request.transactionReference ? `🔖 <b>Ref:</b> <code>${this.escapeHtml(request.transactionReference)}</code>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Time:</b> ${timeStr}\n\n` +
          `<i>Awaiting player reference submission...</i>`;
        break;

      case 'DEPOSIT_PROOF_SUBMITTED':
        messageHtml =
          `📨 <b>DEPOSIT PAYMENT PROOF SUBMITTED</b> ✨\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          `🏦 <b>Provider:</b> ${this.escapeHtml((request.paymentMethod || 'TELEBIRR').toUpperCase())}\n` +
          `🔖 <b>Ref Code:</b> <code>${this.escapeHtml(request.transactionReference || '—')}</code>\n` +
          (receiptUrl ? `🧾 <b>Ethio Telecom Receipt:</b> <a href="${receiptUrl}">Click to Verify</a>\n` : '') +
          (request.rawSmsText ? `\n📝 <b>Player Pasted SMS:</b>\n<pre>${this.escapeHtml(request.rawSmsText.substring(0, 450))}</pre>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Submitted At:</b> ${timeStr}\n\n` +
          `👉 <i>Please open the Admin Console to Approve & Credit or Reject.</i>`;
        break;

      case 'WITHDRAWAL_CREATED':
        messageHtml =
          `🚨 <b>NEW WITHDRAWAL PAYOUT REQUEST</b> 💸\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          `🏦 <b>Payout Via:</b> ${this.escapeHtml((request.paymentMethod || 'TELEBIRR').toUpperCase())}\n` +
          `🎯 <b>Destination Account:</b> <code>${this.escapeHtml(request.accountNumber || '—')}</code>\n` +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Requested At:</b> ${timeStr}\n\n` +
          `⚠️ <b>Notice:</b> Operator inspection of game & bet history is mandatory before approving payouts.\n` +
          `👉 <i>Open Admin Console to inspect.</i>`;
        break;

      case 'REQUEST_APPROVED':
        messageHtml =
          `✅ <b>${request.requestType} APPROVED & SETTLED</b> 🎉\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          (request.transactionReference ? `🔖 <b>Ref:</b> <code>${this.escapeHtml(request.transactionReference)}</code>\n` : '') +
          `👮 <b>Approved By:</b> <b>${this.escapeHtml(approverInfo)}</b>\n` +
          (extra?.note ? `📝 <b>Decision Note:</b> <i>"${this.escapeHtml(extra.note)}"</i>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Settled At:</b> ${timeStr}`;
        break;

      case 'REQUEST_CANCELLED':
        messageHtml =
          `🚫 <b>${request.requestType} CANCELLED BY USER</b>\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          `🏦 <b>Provider:</b> ${this.escapeHtml((request.paymentMethod || 'TELEBIRR').toUpperCase())}\n` +
          `⏱ <b>Status:</b> CANCELLED\n` +
          (extra?.note ? `📝 <b>Note:</b> <i>"${this.escapeHtml(extra.note)}"</i>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Timestamp:</b> ${timeStr}`;
        break;

      case 'REQUEST_EXPIRED':
        messageHtml =
          `⌛ <b>${request.requestType} AUTO-EXPIRED & SETTLED</b>\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          `🏦 <b>Provider:</b> ${this.escapeHtml((request.paymentMethod || 'TELEBIRR').toUpperCase())}\n` +
          `⏱ <b>Status:</b> EXPIRED\n` +
          (extra?.note ? `📝 <b>Note:</b> <i>"${this.escapeHtml(extra.note)}"</i>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Timestamp:</b> ${timeStr}`;
        break;

      case 'REQUEST_REJECTED':
        messageHtml =
          `❌ <b>${request.requestType} REJECTED</b>\n\n` +
          `👤 <b>Player:</b> ${this.escapeHtml(player.username || 'Player')} (<code>${this.escapeHtml(player.phone || 'No phone')}</code>)\n` +
          `💵 <b>Amount:</b> <b>${amountFormatted}</b>\n` +
          (request.transactionReference ? `🔖 <b>Ref:</b> <code>${this.escapeHtml(request.transactionReference)}</code>\n` : '') +
          `👮 <b>Rejected By:</b> <b>${this.escapeHtml(approverInfo)}</b>\n` +
          (extra?.note ? `📝 <b>Rejection Reason:</b> <i>"${this.escapeHtml(extra.note)}"</i>\n` : '') +
          `🆔 <b>Request ID:</b> <code>${request.id.slice(0, 8)}</code>\n` +
          `⏰ <b>Timestamp:</b> ${timeStr}`;
        break;
    }

    if (!messageHtml) return;

    // Send to all targets asynchronously
    const targets = await this.getTargetChatIds();
    if (targets.length === 0) {
      this.logger.debug('No Telegram chat targets available for notification.');
      return;
    }

    for (const target of targets) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target.chatId,
            text: messageHtml,
            parse_mode: 'HTML',
            disable_web_page_preview: false,
          }),
        });
        if (!res.ok) {
          const errData = await res.text();
          this.logger.warn(`Telegram error dispatching to chat ${target.chatId}: ${errData}`);
        } else {
          this.logger.log(`Telegram notification (${event}) delivered to chat ${target.chatId}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch Telegram message: ${err.message}`);
      }
    }
  }
}

