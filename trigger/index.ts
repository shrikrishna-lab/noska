import { client } from "./client";
import "./jobs/daily-cleanup";
import "./jobs/weekly-analytics";
import "./jobs/retry-emails";
import "./jobs/sync-clerk-users";
import "./jobs/database-backup";
import "./jobs/email-queue";
import "./jobs/automation-scheduler";
import "./jobs/notification-dispatcher";
import "./jobs/agent-event-dispatcher";
import "./jobs/webhook-dispatcher";

export default client;
