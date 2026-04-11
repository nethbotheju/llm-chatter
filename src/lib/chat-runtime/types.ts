import type {
  ChatErrorDTO,
  ChatEventDTO,
  ChatRequestDTO,
} from "../contracts";

export type ChatRuntimeInput = ChatRequestDTO;

export interface ChatRuntimeOutput {
  text: string;
  finishReason: string | null;
}

export interface ChatRuntimeCallbacks {
  onToken?: (token: string) => void;
  onDone?: (output: ChatRuntimeOutput) => void;
  onError?: (error: ChatErrorDTO) => void;
  onAbort?: () => void;
}

export interface ChatRuntimeOptions extends ChatRuntimeCallbacks {
  signal?: AbortSignal;
}

export type ChatRuntimeEventStream = AsyncGenerator<ChatEventDTO, void, unknown>;
