import { MCP_DEFAULT_OPTIONS } from '../commands/mcp-launch';

export const MCP_DEV_PORT = MCP_DEFAULT_OPTIONS.port;

export type DevServiceName = 'api' | 'ui' | 'mcp';

export type DevPortMap = Partial<Record<DevServiceName, string>>;

const SERVICE_LABELS: Record<DevServiceName, string> = {
  api: 'API',
  ui: 'UI',
  mcp: 'MCP',
};

export function isValidPortValue(value: string): boolean {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

export function validatePortInput(value: string): true | string {
  if (!isValidPortValue(value)) {
    return 'Must be a port number between 1 and 65535.';
  }
  return true;
}

export function findDevPortConflicts(ports: DevPortMap): DevServiceName[][] {
  const byPort = new Map<string, DevServiceName[]>();

  for (const service of ['api', 'ui', 'mcp'] as const) {
    const port = ports[service];
    if (!port) {
      continue;
    }

    const services = byPort.get(port) ?? [];
    services.push(service);
    byPort.set(port, services);
  }

  return [...byPort.values()].filter((services) => services.length > 1);
}

export function formatDevPortConflictMessage(
  conflicts: DevServiceName[][],
  ports: DevPortMap,
): string {
  const lines = ['Port conflict detected:'];

  for (const services of conflicts) {
    const port = ports[services[0]];
    const labels = services.map((service) => SERVICE_LABELS[service]).join(' and ');

    if (services.includes('mcp') && port === MCP_DEV_PORT) {
      lines.push(
        `  Port ${port} is used by ${labels}. Port ${MCP_DEV_PORT} is reserved for the SolidX MCP server (start:dev).`,
      );
      continue;
    }

    lines.push(`  Port ${port} is assigned to ${labels}.`);
  }

  lines.push('');
  lines.push(
    'Each dev service needs its own port. Update solid-api/.env (PORT), solid-ui/package.json (dev --port), or choose different ports when running create-app.',
  );

  return lines.join('\n');
}

export function validateDevPortAssignments(ports: DevPortMap): string | null {
  const conflicts = findDevPortConflicts(ports);
  if (!conflicts.length) {
    return null;
  }

  return formatDevPortConflictMessage(conflicts, ports);
}

export function validateCreateAppPorts(apiPort: string, uiPort: string): string | null {
  return validateDevPortAssignments({
    api: apiPort,
    ui: uiPort,
    mcp: MCP_DEV_PORT,
  });
}

export function validateCreateAppApiPort(apiPort: string): true | string {
  const portCheck = validatePortInput(apiPort);
  if (portCheck !== true) {
    return portCheck;
  }

  if (apiPort === MCP_DEV_PORT) {
    return `Port ${MCP_DEV_PORT} is reserved for the SolidX MCP server (started by start:dev).`;
  }

  return true;
}

export function validateCreateAppUiPort(
  uiPort: string,
  apiPort: string,
): true | string {
  const portCheck = validatePortInput(uiPort);
  if (portCheck !== true) {
    return portCheck;
  }

  if (uiPort === MCP_DEV_PORT) {
    return `Port ${MCP_DEV_PORT} is reserved for the SolidX MCP server (started by start:dev).`;
  }

  if (uiPort === apiPort) {
    return `UI port must differ from the API port (${apiPort}).`;
  }

  return true;
}
