import { registerProvidersIpc } from "./providers";
import { registerModelsIpc } from "./models";
import { registerAssistantsIpc } from "./assistants";
import { registerConversationsIpc } from "./conversations";
import { registerSearchIpc } from "./search";
import { registerExportIpc } from "./export";
import { registerStatsIpc } from "./stats";
import { registerResetIpc } from "./reset";

export function registerAllIpc() {
  registerProvidersIpc();
  registerModelsIpc();
  registerAssistantsIpc();
  registerConversationsIpc();
  registerSearchIpc();
  registerExportIpc();
  registerStatsIpc();
  registerResetIpc();
}
