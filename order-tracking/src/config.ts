export const DEFAULT_PORT = 3000;

export function getPort(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number(env.PORT);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}
