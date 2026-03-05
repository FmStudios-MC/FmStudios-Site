export interface Server {
  name: string;
  game: string;
  address: string;
  port?: number;
  version: string;
  modpack?: string;
  description: string;
  status: 'online' | 'offline' | 'maintenance';
  maxPlayers?: number;
}

export const servers: Server[] = [
  {
    name: 'Create Unbound Community Server',
    game: 'Minecraft',
    address: '/',
    port: 25565,
    version: '21.6',
    description: 'Our official Create Unbound community server. Open for all players!',
    status: 'offline',
  },
  {
    name: 'Hytale Community Server',
    game: 'Hytale',
    address: '176.9.102.179',
    port: 25571,
    version: 'Latest',
    description: 'Our official Hytale community server. Open for all players!',
    status: 'offline',
  },
];
