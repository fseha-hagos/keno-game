import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
  Request,
  ForbiddenException,
  Logger,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaymentEvidence,
  PaymentEvidenceSource,
  PaymentEvidenceStatus,
} from '../../database/entities/payment-evidence.entity';
import { PaymentParserRegistry } from './parsers/payment-parser.registry';
import { DepositMatchingService } from './deposit-matching.service';
import {
  CONFIGURED_PAYMENT_PROVIDERS,
  getProviderInfo,
} from './providers/payment-providers.config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class MacroDroidWebhookDto {
  @IsOptional()
  @IsString()
  sender?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  timestamp?: number | string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  // Direct MacroDroid magic variables support
  @IsOptional()
  @IsString()
  sms_number?: string;

  @IsOptional()
  @IsString()
  sms_message?: string;

  @IsOptional()
  @IsString()
  sms_body?: string;

  @IsOptional()
  sms_time?: number | string;

  @IsOptional()
  @IsString()
  not_app_name?: string;

  @IsOptional()
  @IsString()
  not_text?: string;

  @IsOptional()
  @IsString()
  not_title?: string;
}

export class SimulateNotificationDto {
  @IsNotEmpty()
  @IsString()
  providerId!: 'telebirr' | 'mpesa' | 'cbe_birr' | 'cbe_bank' | 'other_bank';

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  transactionReference?: string;

  @IsOptional()
  @IsString()
  senderPhone?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  customText?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class ManualLinkDto {
  @IsNotEmpty()
  @IsString()
  depositId!: string;

  @IsNotEmpty()
  @IsString()
  evidenceId!: string;
}

@ApiTags('Payments & Ingestion')
@Controller('api/v1/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly parserRegistry: PaymentParserRegistry,
    private readonly matchingService: DepositMatchingService,
    @InjectRepository(PaymentEvidence)
    private readonly evidenceRepo: Repository<PaymentEvidence>,
  ) {}

  /**
   * Public endpoint to fetch configured payment provider instructions & details.
   */
  @Get('providers')
  @ApiOperation({ summary: 'Get payment provider configurations & deposit instructions' })
  getProviders() {
    return CONFIGURED_PAYMENT_PROVIDERS;
  }

  /**
   * Secure Webhook for MacroDroid Android Device.
   * MacroDroid catches incoming SMS or app notifications and sends them here.
   * Supports both POST (JSON body or query params) and GET (query params) for effortless MacroDroid setup.
   */
  @Get('webhook/macrodroid')
  @Post('webhook/macrodroid')
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  @ApiOperation({ summary: 'Secured GET/POST webhook to receive MacroDroid SMS/notification data' })
  @ApiHeader({
    name: 'x-macrodroid-secret',
    required: false,
    description: 'Webhook authorization secret',
  })
  async receiveMacroDroidNotification(
    @Headers('x-macrodroid-secret') secretHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Query('secret') secretQuery?: string,
    @Query() query?: any,
    @Body() payload: MacroDroidWebhookDto = {},
  ) {
    const configuredSecret =
      this.configService.get<string>('MACRODROID_WEBHOOK_SECRET') ||
      'keno_macrodroid_secure_webhook_secret_2026';

    const providedSecret =
      secretHeader ||
      secretQuery ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '') ||
      query?.secret;

    if (!providedSecret || providedSecret !== configuredSecret) {
      this.logger.warn(`Unauthorized MacroDroid webhook attempt from secret: "${providedSecret}"`);
      throw new UnauthorizedException('Invalid or missing MacroDroid webhook secret');
    }

    const messageText =
      payload.sms_message ||
      payload.sms_body ||
      payload.message ||
      payload.text ||
      payload.body ||
      payload.not_text ||
      query?.sms_message ||
      query?.sms_body ||
      query?.message ||
      query?.text ||
      query?.body ||
      '';
    const senderHeader =
      payload.sms_number ||
      payload.sender ||
      payload.not_app_name ||
      payload.not_title ||
      query?.sms_number ||
      query?.sender ||
      query?.from ||
      '';

    if (!messageText.trim()) {
      throw new BadRequestException('Empty notification/message content');
    }

    if (messageText.trim() === '{sms_body}' || messageText.trim() === '[sms_body]') {
      this.logger.warn(
        `Received literal template variable "${messageText}" from phone. MacroDroid magic text was not evaluated.`,
      );
    }

    // 1. Calculate SHA-256 payload hash for deduplication
    const normalizedBody = messageText.replace(/\s+/g, ' ').trim();
    const hashBasis = `${senderHeader.toLowerCase()}_${normalizedBody}_${payload.timestamp || ''}`;
    const payloadHash = crypto.createHash('sha256').update(hashBasis).digest('hex');

    // Check duplicate
    const existing = await this.evidenceRepo.findOne({ where: { payloadHash } });
    if (existing) {
      this.logger.log(`Duplicate MacroDroid notification ignored. Existing Evidence #${existing.id}`);
      return {
        status: 'DUPLICATE_IGNORED',
        evidenceId: existing.id,
        message: 'Notification already recorded and deduplicated',
      };
    }

    // 2. Parse notification
    const parsed = this.parserRegistry.parseNotification(senderHeader, messageText);

    // If transaction reference already exists for this provider, check ref duplication
    if (parsed.transactionReference) {
      const existingRef = await this.evidenceRepo.findOne({
        where: {
          provider: parsed.provider,
          parsedTransactionRef: parsed.transactionReference,
        },
      });
      if (existingRef) {
        this.logger.warn(
          `Transaction ref ${parsed.transactionReference} already recorded in evidence #${existingRef.id}`,
        );
      }
    }

    // 3. Store Evidence
    const receivedAt = payload.timestamp ? new Date(payload.timestamp) : new Date();
    const source =
      payload.type === 'notification'
        ? PaymentEvidenceSource.MACRODROID_NOTIFICATION
        : PaymentEvidenceSource.MACRODROID_SMS;

    const evidence = this.evidenceRepo.create({
      source,
      deviceId: payload.deviceId || 'android_phone_01',
      senderHeader,
      rawText: messageText,
      receivedAt: isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
      payloadHash,
      provider: parsed.provider,
      parsedTransactionRef: parsed.transactionReference,
      parsedAmountMinor: parsed.amountMinor,
      parsedCurrency: parsed.currency || 'ETB',
      parsedSenderPhone: parsed.senderPhone,
      parsedSenderName: parsed.senderName,
      parsedSenderAccount: parsed.senderAccount,
      parsedTimestamp: parsed.transactionTime,
      status: PaymentEvidenceStatus.UNMATCHED,
      matchConfidence: parsed.confidence,
      metadata: {
        rawSnippet: parsed.rawSnippet,
        devicePayload: payload,
      },
    });

    const savedEvidence = await this.evidenceRepo.save(evidence);
    this.logger.log(`Saved PaymentEvidence #${savedEvidence.id} for provider ${savedEvidence.provider}`);

    // 4. Run Matching Engine against active PENDING deposits
    const matchedEvidence = await this.matchingService.processIncomingEvidence(savedEvidence);

    return {
      status: 'ACCEPTED',
      evidenceId: matchedEvidence.id,
      provider: matchedEvidence.provider,
      parsed: {
        transactionReference: matchedEvidence.parsedTransactionRef,
        amountMinor: matchedEvidence.parsedAmountMinor,
        senderPhone: matchedEvidence.parsedSenderPhone,
        senderName: matchedEvidence.parsedSenderName,
        confidence: matchedEvidence.matchConfidence,
      },
      matchStatus: matchedEvidence.status,
      matchedDepositId: matchedEvidence.matchedPaymentRequestId || null,
      matchReason: matchedEvidence.matchReason || null,
    };
  }

  /**
   * Secure GET Webhook for MacroDroid Android Device.
   * Allows passing parameters directly in the URL query string:
   * ?secret=...&sender=[sms_number]&message=[sms_body]
   */
  @Get('webhook/macrodroid')
  @ApiOperation({ summary: 'Secured GET webhook to receive MacroDroid SMS data via query parameters' })
  async receiveMacroDroidGetWebhook(
    @Headers('x-macrodroid-secret') secretHeader?: string,
    @Headers('authorization') authHeader?: string,
    @Query('secret') secretQuery?: string,
    @Query() query?: any,
  ) {
    return this.receiveMacroDroidNotification(secretHeader, authHeader, secretQuery, query, {});
  }

  /**
   * Admin-Only: Simulate an incoming notification for testing detection & matching.
   */
  @Post('admin/simulate')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin Only] Simulate MacroDroid payment notification for testing' })
  async simulateNotification(@Request() req: any, @Body() dto: SimulateNotificationDto) {
    if (
      !req.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r),
      )
    ) {
      throw new ForbiddenException('Admin only');
    }

    let sender = 'telebirr';
    let text = '';
    const now = new Date();
    const dateFormatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    const amountStr = dto.amount.toFixed(2);
    const ref = dto.transactionReference || `SIM${Date.now().toString().slice(-8)}`;
    const phone = dto.senderPhone || '0911223344';
    const name = dto.senderName || 'Abebe Kebede';

    if (dto.customText) {
      text = dto.customText;
      sender = dto.providerId;
    } else {
      switch (dto.providerId) {
        case 'telebirr':
          sender = 'telebirr';
          text = `Dear Customer\nYou have received ETB ${amountStr} from ${name}(${phone})  on ${dateFormatted}. Your transaction number is ${ref}. Your current E-Money Account balance is ETB 10,500.00.\nThank you for using telebirr\nEthio telecom`;
          break;
        case 'mpesa':
          sender = 'M-PESA';
          text = `${ref} Confirmed. You have received ETB ${amountStr} from ${phone} - ${name} on ${dateFormatted}. New M-PESA balance is ETB 8,400.00.`;
          break;
        case 'cbe_birr':
          sender = 'CBEBirr';
          text = `Dear Customer, ETB ${amountStr} has been transferred to your CBE Birr account 0978614151 from ${phone} ${name}. Txn ID: ${ref} on ${dateFormatted}. Balance is ETB 4,200.00.`;
          break;
        case 'cbe_bank':
          sender = 'CBE';
          text = `Dear Customer, your account 1000*****6789 has been credited with ETB ${amountStr} on ${dateFormatted} by mobile transfer from 1000*****1234 / ${name}. Txn Ref: ${ref}. Your current balance is ETB 25,000.00.`;
          break;
        default:
          sender = 'Bank Transfer';
          text = `Received ETB ${amountStr} from ${name} (${phone}). Ref: ${ref}. Date: ${dateFormatted}.`;
          break;
      }
    }

    const secret =
      this.configService.get<string>('MACRODROID_WEBHOOK_SECRET') ||
      'keno_macrodroid_secure_webhook_secret_2026';

    return this.receiveMacroDroidNotification(
      secret,
      '',
      undefined,
      undefined,
      {
        sender,
        message: text,
        timestamp: Date.now(),
        deviceId: dto.deviceId || 'admin_simulator_01',
        type: 'sms',
      },
    );
  }

  /**
   * Admin-Only: List payment evidence logs.
   */
  @Get('admin/evidence')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin Only] List incoming payment evidence items' })
  async getEvidenceList(
    @Request() req: any,
    @Query('status') status?: PaymentEvidenceStatus,
    @Query('limit') limit = 100,
  ) {
    if (
      !req.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r),
      )
    ) {
      throw new ForbiddenException('Admin only');
    }
    return this.matchingService.getEvidence(status, Number(limit));
  }

  /**
   * Admin-Only: Manually link an evidence record to a pending deposit request.
   */
  @Post('admin/link')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: false, transform: true }))
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin Only] Manually link evidence to a deposit request' })
  async manualLink(
    @Request() req: any,
    @Body() body: ManualLinkDto,
  ) {
    if (
      !req.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r),
      )
    ) {
      throw new ForbiddenException('Admin only');
    }
    return this.matchingService.manualLinkEvidence(body.depositId, body.evidenceId, req.user.id);
  }

  /**
   * Admin-Only: Unlink evidence from a deposit request.
   */
  @Post('admin/unlink/:depositId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin Only] Unlink evidence from a deposit request' })
  async unlink(@Request() req: any, @Param('depositId') depositId: string) {
    if (
      !req.user.roles?.some((r: string) =>
        ['SUPER_ADMIN', 'FINANCE', 'GAME_OPERATOR'].includes(r),
      )
    ) {
      throw new ForbiddenException('Admin only');
    }
    return this.matchingService.unlinkEvidence(depositId);
  }

  /**
   * MacroDroid Configuration Guide and Template.
   */
  @Get('macrodroid-guide')
  @ApiOperation({ summary: 'Get MacroDroid setup instructions and HTTP action templates' })
  getMacroDroidGuide() {
    const secret =
      this.configService.get<string>('MACRODROID_WEBHOOK_SECRET') ||
      'keno_macrodroid_secure_webhook_secret_2026';

    return {
      title: 'MacroDroid Android Automation Setup Guide',
      targetEndpoint: '/api/v1/payments/webhook/macrodroid',
      phoneLanWebhookUrl: 'http://192.168.43.149:3000/api/v1/payments/webhook/macrodroid',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-macrodroid-secret': secret,
      },
      supportedTriggers: [
        {
          trigger: 'SMS Received',
          configuration: 'Select incoming SMS from contacts or numbers: Telebirr, 127, M-PESA, CBEBirr, 847, CBE',
          magicVariables: {
            sender: '{sms_number}',
            message: '{sms_body}',
            timestamp: '{system_time_ms}',
          },
        },
        {
          trigger: 'Notification Received',
          configuration: 'Select apps: Telebirr, M-Pesa, CBE Birr, CBE Mobile Banking',
          magicVariables: {
            sender: '{not_app_name}',
            message: '{not_title} {not_text} {not_ticker}',
            timestamp: '{system_time_ms}',
          },
        },
      ],
      sampleJsonPayload: {
        sender: '{sms_number}',
        message: '{sms_body}',
        timestamp: '{system_time_ms}',
        deviceId: 'telebirr_cbe_primary_phone',
        type: 'sms',
      },
    };
  }
}
