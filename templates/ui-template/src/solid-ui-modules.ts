import {
  createSolidUiModuleRuntime,
  getSolidUiModules,
  registerSolidUiModuleExtensions,
  type SolidUiModule,
} from "@solidxai/core-ui";

const moduleImports = import.meta.glob<SolidUiModule>("./*/*.ui-module.ts", {
  eager: true,
  import: "default",
});

export const solidUiModules = getSolidUiModules(moduleImports);

registerSolidUiModuleExtensions(solidUiModules);

export const solidUiModuleRuntime = createSolidUiModuleRuntime(solidUiModules);
