const backendPort = import.meta.env.BACKEND_PORT;
const backendHost = import.meta.env.BACKEND_HOST || 'localhost';

export function getBackendUrl(): string {
    if (!backendPort) {
        throw new Error('BACKEND_PORT environment variable is not set');
    }

    return `http://${backendHost}:${backendPort}`;
}
