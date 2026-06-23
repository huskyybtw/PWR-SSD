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
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pin_hash` text,
	`base_currency` text NOT NULL,
	`created_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `goals` ADD `user_id` integer NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `goals` ADD `goal_type` text DEFAULT 'savings' NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `category_id` integer REFERENCES categories(id);--> statement-breakpoint
ALTER TABLE `goals` ADD `start_date` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `goals` ADD `alert_message` text;