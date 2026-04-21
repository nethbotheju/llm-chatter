import type { UIMessage } from "ai";
import type { ChatProviderConfigDTO, ChatAssistantConfigDTO } from "../contracts";

export interface ChatRuntimeInput {
  messages: UIMessage[];
  model: string;
  provider: ChatProviderConfigDTO;
  assistantConfig?: ChatAssistantConfigDTO;
}
