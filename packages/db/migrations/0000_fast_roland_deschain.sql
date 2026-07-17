CREATE TABLE IF NOT EXISTS `AppConfig` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `Assistant` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`systemPrompt` text NOT NULL,
	`temperature` real DEFAULT 0.7 NOT NULL,
	`topP` real DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`isDefault` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `Conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`assistantId` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`assistantId`) REFERENCES `Assistant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `Conversation_assistantId_idx` ON `Conversation` (`assistantId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `Conversation_createdAt_idx` ON `Conversation` (`createdAt`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `McpServer` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`transport` text NOT NULL,
	`command` text,
	`args` text,
	`env` text,
	`url` text,
	`headers` text,
	`config` text,
	`enabled` integer DEFAULT true NOT NULL,
	`isBuiltin` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `McpServer_slug_unique` ON `McpServer` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `Message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`metadata` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `Message_conversationId_idx` ON `Message` (`conversationId`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `Message_createdAt_idx` ON `Message` (`createdAt`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `Model` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`providerId` text NOT NULL,
	`capabilities` text NOT NULL,
	`catalogModelId` text,
	`metadata` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`providerId`) REFERENCES `Provider`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `Model_providerId_name_key` ON `Model` (`providerId`,`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `Provider` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`baseUrl` text,
	`apiKeyEncrypted` text,
	`catalogId` text,
	`lastSyncedAt` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `Provider_catalogId_unique` ON `Provider` (`catalogId`);