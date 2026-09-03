/// <reference types="webmcp-types" />

export function getWebMcpModelContext(
  documentValue: Document = document,
): WebMCP.ModelContext | null {
  return documentValue.modelContext ?? null;
}

export function isWebMcpOriginIsolated(windowValue: Window = window): boolean {
  return (
    (windowValue as Window & { originAgentCluster?: boolean })
      .originAgentCluster === true
  );
}
