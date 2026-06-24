--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pin_hash` text,
	`base_currency` text NOT NULL,
	`created_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--> statement-breakpoint
CREATE TABLE `financial_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`goal_type` text NOT NULL,
	`category_id` integer,
	`name` text,
	`target_amount` real NOT NULL,
	`current_amount` real DEFAULT 0 NOT NULL,
	`start_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`end_date` text NOT NULL,
	`alert_message` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer DEFAULT 1 NOT NULL,
	`goal_id` integer,
	`type` text DEFAULT 'goal_achieved' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`related_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `financial_goals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `report_transactions` (
	`report_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`generation_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`total_income` real DEFAULT 0 NOT NULL,
	`total_expenses` real DEFAULT 0 NOT NULL,
	`net_balance` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transaction_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`import_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`log_id` integer NOT NULL,
	`category_id` integer,
	`amount` real NOT NULL,
	`date` text NOT NULL,
	`description` text,
	`transaction_id_text` text,
	FOREIGN KEY (`log_id`) REFERENCES `transaction_logs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);