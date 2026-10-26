import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getMetadataArgsStorage } from 'typeorm';
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
            synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
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
            synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
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
          synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl: dbSsl === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    TypeOrmModule.forFeature(entityClasses),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
