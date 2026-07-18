function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extractResponsesApiText(response: unknown) {
  if (isRecord(response) && typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  if (!isRecord(response) || !Array.isArray(response.output)) return null;

  const chunks: string[] = [];
  for (const outputItem of response.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) continue;
    for (const contentItem of outputItem.content) {
      if (isRecord(contentItem) && typeof contentItem.text === 'string' && contentItem.text.trim().length > 0) {
        chunks.push(contentItem.text.trim());
      }
    }
  }

  return chunks.length > 0 ? chunks.join('\n') : null;
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : isRecord(error) && error.name === 'AbortError';
}
