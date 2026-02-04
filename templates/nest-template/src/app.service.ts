import { DynamicModule, Injectable, Logger } from '@nestjs/common';
import { getDynamicModuleNames } from '@solidstarters/solid-core';


@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  async loadModules(): Promise<DynamicModule[]> {
    const enabledModules = getDynamicModuleNames();

    // Base path 
    const basePath =  './';
    const modules = await Promise.all(
      enabledModules.map(async (moduleName) => {
        const modulePath = `${basePath}${moduleName}/${moduleName}.module`;
        try {
          const importedModule = await import(modulePath);

          // Return the first exported value, assuming it is the module class
          return Object.values(importedModule)[0] as DynamicModule;

        } catch (error) {
          this.logger.error(`Failed to load module "${moduleName}" from "${modulePath}":`, error);
          return null;
        }
      })
    );

    return modules.filter((module): module is DynamicModule => module !== null);
  }
}