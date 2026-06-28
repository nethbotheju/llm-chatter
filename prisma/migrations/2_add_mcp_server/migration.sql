-- MCP servers: built-in tool sources and user-configured MCP connections

CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "command" TEXT,
    "args" TEXT,
    "env" TEXT,
    "url" TEXT,
    "headers" TEXT,
    "config" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpServer_slug_key" ON "McpServer"("slug");
