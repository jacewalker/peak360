CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` text,
	`refresh_token_expires_at` text,
	`scope` text,
	`password` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessment_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` text NOT NULL,
	`section_number` integer NOT NULL,
	`data` text,
	`completed_at` text,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_name` text,
	`client_email` text,
	`client_dob` text,
	`client_gender` text,
	`assessment_date` text,
	`current_section` integer DEFAULT 1,
	`status` text DEFAULT 'in_progress',
	`normative_version_id` text,
	`coach_id` text,
	`client_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `normative_ranges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`test_key` text NOT NULL,
	`category` text NOT NULL,
	`gender` text,
	`age_group` text,
	`unit` text,
	`note` text,
	`tiers` text,
	`severity_weight` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `normative_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`ranges_json` text,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pillar_definitions` (
	`pillar_key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`short_summary` text NOT NULL,
	`plain_meaning` text NOT NULL,
	`sort_order` integer NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pillar_page_copy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`heading` text NOT NULL,
	`intro` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pillar_prescriptions` (
	`assessment_id` text NOT NULL,
	`pillar_key` text NOT NULL,
	`summary` text NOT NULL,
	`bullets` text,
	`full_plan_href` text,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`assessment_id`, `pillar_key`),
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` text NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `uploaded_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`assessment_id` text NOT NULL,
	`section_number` integer NOT NULL,
	`file_name` text,
	`extracted_data` text,
	`verification_result` text,
	`status` text DEFAULT 'pending',
	`created_at` text NOT NULL,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`role` text DEFAULT 'coach',
	`banned` integer,
	`ban_reason` text,
	`ban_expires` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text,
	`updated_at` text
);
