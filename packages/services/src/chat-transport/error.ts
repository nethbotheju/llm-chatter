import { chatErrorSchema, type ChatErrorDTO } from "@llm-chatter/contracts";

export interface ChatTransportError extends Error {
  code: string;
  retryable: boolean;
  status: number | null;
  details: string | null;
}

function parseDto(value: unknown): ChatErrorDTO | null {
  try {
    return chatErrorSchema.parse(value);
  } catch {
    return null;
  }
}

function parseDtoFromJson(text: string): ChatErrorDTO | null {
  try {
    return chatErrorSchema.parse(JSON.parse(text));
  } catch {
    return null;
  }
}

// Normalizes any value rejected by a chat transport into an Error that carries
// the ChatErrorDTO fields. Handles both transport shapes:
//  - desktop: the worker posts the DTO object directly → `controller.error(dto)`
//  - web: DefaultChatTransport throws `new Error(await response.text())`, where
//    the response body is the DTO as JSON, so the DTO sits in `error.message`.
export function toChatTransportError(value: unknown): ChatTransportError {
  const dto =
    parseDto(value) ??
    (value instanceof Error ? parseDtoFromJson(value.message) : null);

  const fallbackMessage =
    value instanceof Error ? value.message : "Chat request failed";

  const err = new Error(dto?.message ?? fallbackMessage) as ChatTransportError;
  err.code = dto?.code ?? "UNKNOWN";
  err.retryable = dto?.retryable ?? false;
  err.status = dto?.status ?? null;
  err.details = dto?.details ?? null;
  return err;
}
