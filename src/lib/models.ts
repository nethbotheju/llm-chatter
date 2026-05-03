export function parseModelCapabilities(capabilities: string): string[] {
  try {
    return JSON.parse(capabilities);
  } catch {
    return [];
  }
}

export function hasVisionCapability(capabilities: string): boolean {
  return parseModelCapabilities(capabilities).includes("vision");
}
