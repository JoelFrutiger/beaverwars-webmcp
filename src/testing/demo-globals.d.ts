export {};

declare global {
  interface Window {
    __beaverWarsWebMcpDemo: {
      execute(
        name: string,
        input?: Record<string, unknown>,
      ): Promise<Record<string, unknown>>;
      tools(): Promise<Array<{ name: string }>>;
    };
  }
}
