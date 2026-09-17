import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export interface CreateAuditLogParams {
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: CreateAuditLogParams): Promise<AuditLog> {
    try {
      const entry = this.auditRepo.create({
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        requestId: params.requestId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
      });

      const saved = await this.auditRepo.save(entry);
      this.logger.log(`[AUDIT] ${params.action} on ${params.entity}:${params.entityId} by ${params.actorId}`);
      return saved;
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`, err.stack);
      // In production, send to fallback dead letter queue / CloudWatch
      throw err;
    }
  }

  async findRecent(limit = 100): Promise<AuditLog[]> {
    return this.auditRepo.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
