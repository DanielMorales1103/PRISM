export function getPushToken(): Promise<string | null>;
export function listenForPush(onReceive: () => void): () => void;
