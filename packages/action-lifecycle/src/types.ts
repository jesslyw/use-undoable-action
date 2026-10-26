// Lifecycle states. An action is in exactly one at a time.
export type State<TArg> =
	| { status: "idle" }
	| { status: "executing"; arg: TArg }
	| { status: "executeFailed"; arg: TArg; error: unknown }
	| { status: "undoable"; arg: TArg; deadline: number }
	| { status: "undoing"; arg: TArg }
	// Deadline is kept so undo can be retried until it passes.
	| { status: "undoFailed"; arg: TArg; deadline: number; error: unknown }
	| { status: "undone"; arg: TArg }
	| { status: "expired"; arg: TArg }
	| { status: "dismissed"; arg: TArg };

export type Status = State<unknown>["status"];

export type ErrorContext<TArg> = {
	phase: "execute" | "undo";
	arg: TArg;
};

export type Options<TArg> = {
	execute: (arg: TArg) => Promise<unknown>;
	undo: (arg: TArg) => Promise<unknown>;
	// Undo window in ms. Defaults to 5000.
	duration?: number;
	onSuccess?: (arg: TArg) => void;
	onUndo?: (arg: TArg) => void;
	onError?: (error: unknown, context: ErrorContext<TArg>) => void;
};

// execute() and undo() never reject; failures are reported via state and onError.
// Calls that aren't valid in the current state are ignored.
export interface ActionController<TArg> {
	execute(arg: TArg): Promise<void>;
	undo(): Promise<void>;
	dismiss(): void;
	// Stops the timer and ignores results that are still in flight.
	// The operations themselves are not cancelled.
	dispose(): void;
	getSnapshot(): State<TArg>;
	// Returns an unsubscribe function.
	subscribe(listener: () => void): () => void;
}
