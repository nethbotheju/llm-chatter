import type { ChatErrorDTO } from "../contracts";

export class ChatError extends Error {
  code: string;
  status: number | null;
  retryable: boolean;
  details: string | null;

  constructor(input: ChatErrorDTO) {
    super(input.message);
    this.name = "ChatError";
    this.code = input.code;
    this.status = input.status ?? null;
    this.retryable = input.retryable ?? false;
    this.details = input.details ?? null;
  }

  toDTO(): ChatErrorDTO {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      retryable: this.retryable,
      details: this.details,
    };
  }
}

export function toChatError(error: unknown): ChatError {
  if (error instanceof ChatError) {
    return error;
  }

  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    if (name.includes("abort")) {
      return new ChatError({
        code: "CHAT_ABORTED",
        message: "Chat request aborted",
        status: null,
        retryable: false,
        details: error.message,
      });
    }

    return new ChatError({
      code: "CHAT_RUNTIME_ERROR",
      message: error.message || "Chat runtime failed",
      status: null,
      retryable: false,
      details: null,
    });
  }

  return new ChatError({
    code: "CHAT_UNKNOWN_ERROR",
    message: "Unknown chat runtime error",
    status: null,
    retryable: false,
    details: null,
  });
}
