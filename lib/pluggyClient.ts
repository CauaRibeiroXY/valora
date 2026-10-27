import { PluggyClient } from 'pluggy-sdk';

let pluggyClientInstance: PluggyClient | null = null;

export const getPluggyClient = (customClientId?: string, customClientSecret?: string): PluggyClient => {
  const clientId = customClientId || process.env.PLUGGY_CLIENT_ID || '';
  const clientSecret = customClientSecret || process.env.PLUGGY_CLIENT_SECRET || '';

  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados.');
  }

  // If custom credentials are provided, create a fresh client
  if (customClientId && customClientSecret) {
    return new PluggyClient({ clientId, clientSecret });
  }

  if (!pluggyClientInstance) {
    pluggyClientInstance = new PluggyClient({ clientId, clientSecret });
  }

  return pluggyClientInstance;
};
