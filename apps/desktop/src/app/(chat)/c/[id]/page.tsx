import { ConversationPage } from "@llm-chatter/frontend";

export default ConversationPage;

// Satisfy Next.js static-export requirements for dynamic routes
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}
