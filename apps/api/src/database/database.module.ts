import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as entities from './entities';

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
            entities: Object.values(entities),
            synchronize: true,
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
            entities: Object.values(entities),
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
          entities: Object.values(entities),
          synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
          logging: configService.get<string>('NODE_ENV') === 'development',
          ssl: dbSsl === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    TypeOrmModule.forFeature(Object.values(entities)),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
