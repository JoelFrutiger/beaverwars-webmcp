import type * as z from "zod/v4";
import type {
  actOutputSchema,
  closeMatchOutputSchema,
  gameGuideInputSchema,
  gameGuideOutputSchema,
  listActionsOutputSchema,
  observeOutputSchema,
  startMatchOutputSchema,
  waitUntilActingOutputSchema,
} from "./schemas";
import type { PAGE_BOUND_INPUT_SCHEMAS } from "./tool-definitions";

export type GameGuideInput = z.output<typeof gameGuideInputSchema>;
export type GameGuideResult = z.output<typeof gameGuideOutputSchema>;
export type JoinInput = z.output<
  (typeof PAGE_BOUND_INPUT_SCHEMAS)["join_agent_seat"]
>;
export type JoinResult = z.output<typeof startMatchOutputSchema>;
export type ObserveInput = z.output<
  (typeof PAGE_BOUND_INPUT_SCHEMAS)["observe"]
>;
export type ObserveResult = z.output<typeof observeOutputSchema>;
export type ListActionsInput = z.output<
  (typeof PAGE_BOUND_INPUT_SCHEMAS)["list_actions"]
>;
export type ListActionsResult = z.output<typeof listActionsOutputSchema>;
export type ActInput = z.output<(typeof PAGE_BOUND_INPUT_SCHEMAS)["act"]>;
export type ActResult = z.output<typeof actOutputSchema>;
export type WaitInput = z.output<
  (typeof PAGE_BOUND_INPUT_SCHEMAS)["wait_until_acting"]
>;
export type WaitResult = z.output<typeof waitUntilActingOutputSchema>;
export type CloseResult = z.output<typeof closeMatchOutputSchema>;

export interface AgentPlayService {
  gameGuide(
    input: GameGuideInput,
    signal?: AbortSignal,
  ): Promise<GameGuideResult>;
  join(input: JoinInput, signal?: AbortSignal): Promise<JoinResult>;
  observe(input: ObserveInput, signal?: AbortSignal): Promise<ObserveResult>;
  listActions(
    input: ListActionsInput,
    signal?: AbortSignal,
  ): Promise<ListActionsResult>;
  act(input: ActInput, signal?: AbortSignal): Promise<ActResult>;
  waitUntilActing(input: WaitInput, signal?: AbortSignal): Promise<WaitResult>;
  close(signal?: AbortSignal): Promise<CloseResult>;
  dispose(): void;
}

export type AgentLaunchDescriptor =
  | { expiresAt: number | null; kind: "invitation" }
  | { canForget: boolean; kind: "resume" }
  | { kind: "none" };

export interface AgentRuntimeGate {
  initialize(signal?: AbortSignal): Promise<void>;
  revalidate(signal?: AbortSignal): Promise<void>;
}

export interface AgentPageHost {
  forgetSavedTarget?(): Promise<void>;
  launch: AgentLaunchDescriptor;
  launchMessage?: string;
  onJoined?(result: JoinResult): Promise<void>;
  runtimeGate: AgentRuntimeGate;
  service: AgentPlayService;
}

export type AgentPageController = { dispose(): void };
