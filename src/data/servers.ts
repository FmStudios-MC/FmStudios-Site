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
    name: 'Simply Legacy SMP',
    game: 'Minecraft',
    address: 'fmi-legacy.kinetichosting.gg',
    version: '1.21.10',
    description: 'Our SMP for the Simply Legacy Modpack',
    status: 'online',
  },
    {
    name: 'Create Unbound Server',
    game: 'Minecraft',
    address: '/',
    port: 25565,
    version: '1.21.10',
    description: 'The official Modpack Server for Create Unbound',
    status: 'maintenance',
  },
];
