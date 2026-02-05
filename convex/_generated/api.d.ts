/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as agent_work from "../agent_work.js";
import type * as agents from "../agents.js";
import type * as agents_update from "../agents_update.js";
import type * as broadcast from "../broadcast.js";
import type * as command from "../command.js";
import type * as daemon from "../daemon.js";
import type * as documents from "../documents.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as standup from "../standup.js";
import type * as task_assignments from "../task_assignments.js";
import type * as task_autonomy from "../task_autonomy.js";
import type * as tasks from "../tasks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  agent_work: typeof agent_work;
  agents: typeof agents;
  agents_update: typeof agents_update;
  broadcast: typeof broadcast;
  command: typeof command;
  daemon: typeof daemon;
  documents: typeof documents;
  messages: typeof messages;
  migrations: typeof migrations;
  notifications: typeof notifications;
  standup: typeof standup;
  task_assignments: typeof task_assignments;
  task_autonomy: typeof task_autonomy;
  tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
