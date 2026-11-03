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
      // Ensure newly added columns exist in Postgres automatically on production/Render
      if (this.dataSource.options.type === 'postgres') {
        await this.dataSource.query(
          `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegramChatId" character varying(50);`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ALTER COLUMN "adminNote" TYPE text;`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "rawSmsText" text;`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp with time zone;`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchedEvidenceId" uuid;`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchConfidence" integer;`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "matchReason" character varying(255);`
        );
        await this.dataSource.query(
          `ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "idempotencyKey" character varying(64);`
        );
        await this.dataSource.query(`
          DO \$\$
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
          END \$\$;
        `);
        this.logger.log('Database schema check: "telegramChatId" column verified/added successfully.');
        // Purge empty cancelled deposits without a reference number so they don't clutter history
        await this.dataSource.query(`
          DELETE FROM "payment_requests"
          WHERE "status" = 'CANCELLED'
            AND "requestType" = 'DEPOSIT'
            AND ("transactionReference" IS NULL OR TRIM("transactionReference") = '');
        `);
      }
    } catch (err: any) {
      this.logger.warn(`Could not run schema self-heal query: ${err.message}`);
    }
  }
}
