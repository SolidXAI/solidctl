import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as SolidCoreModuleExports from '@solidxai/core';
import { DatasourceType, getDynamicModuleNames, ISolidDatabaseModule, parseBooleanEnv, SolidDatabaseModule } from '@solidxai/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { join } from 'path';
import { getMetadataArgsStorage } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Logger } from 'winston';
import { WinstonTypeORMLogger } from '@solidxai/core'; // Assuming you have this custom logger

function getEntitiesFromExports(exports: Record<string, any>) {
    const metadataStorage = getMetadataArgsStorage();
    return Object.values(exports).filter((item) =>
      metadataStorage.tables.some((table) => table.target === item)
    );
}
const coreEntities = getEntitiesFromExports(SolidCoreModuleExports);

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            // This becomes the default by default.
            // name: 'default',
            useFactory: (logger: Logger) => {
                const dynamicModules = getDynamicModuleNames();

                const entities = [
                    ...coreEntities,
                    ...dynamicModules.map(module =>
                        join(__dirname, `./${module}/entities/*.entity.{ts,js}`)
                    ),
                ];

                return {
                    // type of our database. 
                    type: 'postgres',
                    host: process.env.DEFAULT_DATABASE_HOST,
                    port: +process.env.DEFAULT_DATABASE_PORT,
                    username: process.env.DEFAULT_DATABASE_USER,
                    password: process.env.DEFAULT_DATABASE_PASSWORD,
                    // name of our database
                    database: process.env.DEFAULT_DATABASE_NAME,
                    entities: entities,
                    // your entities will be synced with the database (recommended: disable in prod)
                    synchronize: parseBooleanEnv('DEFAULT_DATABASE_SYNCHRONIZE'),
                    logging: parseBooleanEnv('DEFAULT_DATABASE_LOGGING'),
                    logger: parseBooleanEnv('DEFAULT_DATABASE_LOGGING') ? new WinstonTypeORMLogger(logger) : undefined,  // Pass in the custom WinstonLogger
                    namingStrategy: new SnakeNamingStrategy(),
                    maxQueryExecutionTime: 500,
                    extra: {
                        max: Number(process.env.DEFAULT_DATABASE_POOL_MAX ?? 20),
                        connectionTimeoutMillis: 30000,
                        idleTimeoutMillis: 30000,
                        statement_timeout: 15000,
                        idle_in_transaction_session_timeout: 60000,
                    },
                    retryAttempts: Number(process.env.DEFAULT_DATABASE_RETRY_ATTEMPTS ?? 0),
                    retryDelay: Number(process.env.DEFAULT_DATABASE_RETRY_DELAY_MS ?? 0),
                }
            },
            inject: [WINSTON_MODULE_PROVIDER]
        }),
    ],
})
@SolidDatabaseModule()
export class DefaultDBModule implements ISolidDatabaseModule {
    type(): DatasourceType {
        return DatasourceType.postgres;
    }

    name(): string {
        return 'default';
    }
}
