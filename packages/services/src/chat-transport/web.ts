import {
  DefaultChatTransport,
  type ChatTransport,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { toChatTransportError } from "./error";

// Wraps DefaultChatTransport so a non-OK /api/chat response (whose body is a
// ChatErrorDTO JSON) is turned into an Error whose `.message` is the DTO
// message and which carries `.code` / `.retryable`. Without this, the SDK's
// default transport throws `new Error(await response.text())`, which surfaces
// the raw JSON string as the chat error message.
export class WebChatTransport extends DefaultChatTransport<UIMessage> {
  sendMessages(
    options: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0],
  ): Promise<ReadableStream<UIMessageChunk>> {
    return super.sendMessages(options).catch((err) => {
      throw toChatTransportError(err);
    });
  }
}
