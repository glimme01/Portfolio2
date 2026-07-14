import type { ChatMessage } from "../context/types";

export interface ChatTransport {
  connect(): void;
  disconnect(): void;
  send(msg: ChatMessage): void;
  onMessage(cb: (msg: ChatMessage) => void): () => void;
}

/** Local-only transport for MVP; swap for Socket.io / Firebase later */
export class MockChatTransport implements ChatTransport {
  private listeners: Array<(msg: ChatMessage) => void> = [];
  private connected = false;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  send(msg: ChatMessage): void {
    if (!this.connected) return;
    this.listeners.forEach((cb) => cb(msg));
  }

  onMessage(cb: (msg: ChatMessage) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}

let sharedTransport: MockChatTransport | null = null;

export function getChatTransport(): MockChatTransport {
  if (!sharedTransport) sharedTransport = new MockChatTransport();
  return sharedTransport;
}
