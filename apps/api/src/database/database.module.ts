import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import * as entities from './entities';

// Filter out enums and non-entity exports; only keep classes with @Entity() decorator
const entityClasses = (Object.values(entities) as any[]).filter(
  (val) =>
    typeof val === 'function' &&
    getMetadataArgsStorage().tables.some((t) => t.target === val),
);

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get<string>('DB_TYPE', 'postgres');

        if (dbType === 'sqlite') {
          return {
            type: 'sqlite',
            database: configService.get<string>('DB_DATABASE', 'keno.sqlite'),
            entities: entityClasses,
            synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
            logging: configService.get<string>('NODE_ENV') === 'development',
          };
        }

        const databaseUrl = configService.get<string>('DATABASE_URL') || configService.get<string>('INTERNAL_DATABASE_URL');
        const dbSsl = configService.get<string>('DB_SSL');
        const useSsl = dbSsl === 'true' || (dbSsl !== 'false' && !!databaseUrl);

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: entityClasses,
            synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
            logging: configService.get<string>('NODE_ENV') === 'development',
            ssl: useSsl ? { rejectUnauthorized: false } : false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USER', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'postgres'),
          database: configService.get<string>('DB_NAME', 'keno_db'),
          entities: entityClasses,
          synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl: dbSsl === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    TypeOrmModule.forFeature(entityClasses),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly dataSource: DataSource) { }

  async onModuleInit() {
    try {
      // Ensure newly added columns and compatible types exist in Postgres automatically on production/Render/VPS
      if (this.dataSource.options.type === 'postgres') {
        const safeQuery = async (sql: string, label: string) => {
          try {
            await this.dataSource.query(sql);
          } catch (e: any) {
            this.logger.warn(`Schema self-heal [${label}]: ${e.message}`);
          }
        };

        await safeQuery(
          `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramChatId" character varying(50);`,
          'users.telegramChatId'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ALTER COLUMN "adminNote" TYPE text;`,
          'payment_requests.adminNote'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "rawSmsText" text;`,
          'payment_requests.rawSmsText'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp with time zone;`,
          'payment_requests.expiresAt'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchedEvidenceId" uuid;`,
          'payment_requests.matchedEvidenceId'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchConfidence" integer;`,
          'payment_requests.matchConfidence'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchReason" character varying(255);`,
          'payment_requests.matchReason'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying(64);`,
          'payment_requests.idempotencyKey'
        );

        // Ensure CANCELLED and EXPIRED are accepted by the enum if the type exists in PostgreSQL
        await safeQuery(`
          DO $$
          BEGIN
            ALTER TYPE payment_requests_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
          EXCEPTION
            WHEN duplicate_object THEN null;
            WHEN undefined_object THEN null;
          END $$;
        `, 'enum.add_cancelled');

        await safeQuery(`
          DO $$
          BEGIN
            ALTER TYPE payment_requests_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
          EXCEPTION
            WHEN duplicate_object THEN null;
            WHEN undefined_object THEN null;
          END $$;
        `, 'enum.add_expired');

        // Drop any leftover CHECK constraints on status
        await safeQuery(`
          DO $$
          DECLARE
              r RECORD;
          BEGIN
              FOR r IN (
                  SELECT conname
                  FROM pg_constraint con
                  JOIN pg_class rel ON rel.oid = con.conrelid
                  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                  WHERE rel.relname = 'payment_requests'
                    AND con.contype = 'c'
                    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
              ) LOOP
                  EXECUTE 'ALTER TABLE "payment_requests" DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
              END LOOP;
          END $$;
        `, 'drop_status_constraints');

        // Convert status and requestType to standard varchar so all statuses work seamlessly
        await safeQuery(
          `ALTER TABLE "payment_requests" ALTER COLUMN "status" TYPE character varying(20) USING "status"::text;`,
          'status_to_varchar'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING';`,
          'status_default_pending'
        );
        await safeQuery(
          `ALTER TABLE "payment_requests" ALTER COLUMN "requestType" TYPE character varying(30) USING "requestType"::text;`,
          'requestType_to_varchar'
        );

        // Purge empty cancelled deposits without a reference number so they don't clutter history
        await safeQuery(`
          DELETE FROM "payment_requests"
          WHERE "status" = 'CANCELLED'
            AND "requestType" = 'DEPOSIT'
            AND ("transactionReference" IS NULL OR TRIM("transactionReference") = '');
        `, 'cleanup_empty_cancelled');

        this.logger.log('Database schema check: columns and status types verified successfully.');
      }
    } catch (err: any) {
      this.logger.warn(`Could not run schema self-heal query: ${err.message}`);
    }
  }
}
