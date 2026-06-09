import { BrowserWindow } from "electron";
import { registerProvidersIpc } from "./providers";
import { registerModelsIpc } from "./models";
import { registerAssistantsIpc } from "./assistants";
import { registerConversationsIpc } from "./conversations";
import { registerSearchIpc } from "./search";
import { registerExportIpc } from "./export";
import { registerStatsIpc } from "./stats";
import { registerResetIpc } from "./reset";
import { registerChatIpc } from "./chat";

export function registerAllIpc() {
  registerProvidersIpc();
  registerModelsIpc();
  registerAssistantsIpc();
  registerConversationsIpc();
  registerSearchIpc();
  registerExportIpc();
  registerStatsIpc();
  registerResetIpc();
  registerChatIpc(() => BrowserWindow.getAllWindows()[0] ?? null);
}
