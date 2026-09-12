CREATE TABLE `distribution_workspaces` (
  `owner_email` text PRIMARY KEY NOT NULL,
  `payload_json` text NOT NULL DEFAULT '{}',
  `revision` integer NOT NULL DEFAULT 1,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX `distribution_workspaces_updated_idx`
  ON `distribution_workspaces` (`updated_at`);
