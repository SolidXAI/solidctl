import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SolidCoreModule, WinstonLoggerConfig } from '@solidx/solid-core';
import { WinstonModule } from 'nest-winston';
import { ClsModule } from 'nestjs-cls';
import { DefaultDBModule } from './app-default-database.module';
import { AppService } from './app.service';


@Module({
  imports: [
    // Register Winston globally
    WinstonModule.forRoot(WinstonLoggerConfig),

    ConfigModule.forRoot({
      isGlobal: true,
    }),

    DefaultDBModule,


    SolidCoreModule,

    EventEmitterModule.forRoot(),

    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      }
    }),

  ],
  controllers: [],
  providers: [
    AppService,
  ],
})
export class AppModule {

  static async forRoot(): Promise<DynamicModule> {
    const appService = new AppService();
    const dynamicModules = await appService.loadModules();

    return {
      module: AppModule,
      imports: [...dynamicModules],
    };
  }
}
