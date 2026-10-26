import type { ActionController, Options, State } from "./types";

const DEFAULT_DURATION = 5000;

export class UndoableActionController<TArg> implements ActionController<TArg> {
	private state: State<TArg> = { status: "idle" };
	private listeners = new Set<() => void>();
	private options: Options<TArg>;
	private duration: number;
	// Bumped for every new action. Results and timers from an older action
	// compare against it and are dropped.
	private actionId = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: Options<TArg>) {
		const duration = options.duration ?? DEFAULT_DURATION;
		if (!Number.isFinite(duration) || duration <= 0) {
			throw new RangeError(
				`duration must be a positive number, got ${duration}`,
			);
		}
		this.options = options;
		this.duration = duration;
	}

	// Arrow functions keep `this` bound when passed around,
	// e.g. to useSyncExternalStore or an onClick handler.
	getSnapshot = (): State<TArg> => this.state;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	execute = async (arg: TArg): Promise<void> => {
		const { status } = this.state;
		if (status === "executing" || status === "undoing") return;

		// A new action replaces the previous one, which can no longer be undone.
		this.clearTimer();
		const id = ++this.actionId;
		this.setState({ status: "executing", arg });

		try {
			await this.options.execute(arg);
		} catch (error) {
			if (id !== this.actionId) return;
			this.setState({ status: "executeFailed", arg, error });
			this.options.onError?.(error, { phase: "execute", arg });
			return;
		}

		if (id !== this.actionId) return;
		const deadline = Date.now() + this.duration;
		this.setState({ status: "undoable", arg, deadline });
		this.scheduleExpiry(id, deadline);
		this.options.onSuccess?.(arg);
	};

	undo = async (): Promise<void> => {
		const state = this.state;
		if (state.status !== "undoable" && state.status !== "undoFailed") return;

		const { arg, deadline } = state;
		const id = this.actionId;
		this.clearTimer();

		// The deadline decides, not the timer. Timers can fire late.
		if (Date.now() >= deadline) {
			this.setState({ status: "expired", arg });
			return;
		}

		// Once started, undo runs to completion even if the deadline passes.
		this.setState({ status: "undoing", arg });

		try {
			await this.options.undo(arg);
		} catch (error) {
			if (id !== this.actionId) return;
			this.setState({ status: "undoFailed", arg, deadline, error });
			this.options.onError?.(error, { phase: "undo", arg });
			// Retry stays possible until the original deadline.
			this.scheduleExpiry(id, deadline);
			return;
		}

		if (id !== this.actionId) return;
		this.setState({ status: "undone", arg });
		this.options.onUndo?.(arg);
	};

	dismiss = (): void => {
		const state = this.state;
		if (state.status !== "undoable" && state.status !== "undoFailed") return;

		this.clearTimer();
		this.setState({ status: "dismissed", arg: state.arg });
	};

	dispose = (): void => {
		this.clearTimer();
		this.actionId++;
	};

	private scheduleExpiry(id: number, deadline: number): void {
		this.timer = setTimeout(
			() => {
				if (id !== this.actionId) return;
				const state = this.state;
				if (state.status === "undoable" || state.status === "undoFailed") {
					this.setState({ status: "expired", arg: state.arg });
				}
			},
			Math.max(0, deadline - Date.now()),
		);
	}

	private clearTimer(): void {
		clearTimeout(this.timer);
		this.timer = undefined;
	}

	private setState(next: State<TArg>): void {
		this.state = next;
		for (const listener of this.listeners) listener();
	}
}
