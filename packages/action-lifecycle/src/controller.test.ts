import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UndoableActionController } from "./controller";
import type { Options } from "./types";

// A promise we can settle by hand, so tests control when operations finish.
function deferred() {
	let resolve!: () => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function setup(overrides: Partial<Options<string>> = {}) {
	const options = {
		execute: vi.fn().mockResolvedValue(undefined),
		undo: vi.fn().mockResolvedValue(undefined),
		onSuccess: vi.fn(),
		onUndo: vi.fn(),
		onError: vi.fn(),
		duration: 5000,
		...overrides,
	};
	const controller = new UndoableActionController<string>(options);
	return { controller, ...options };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("execute", () => {
	it("opens the undo window only after execute succeeds", async () => {
		const op = deferred();
		const { controller, onSuccess } = setup({ execute: () => op.promise });

		const pending = controller.execute("a");
		expect(controller.getSnapshot()).toEqual({ status: "executing", arg: "a" });

		op.resolve();
		await pending;

		expect(controller.getSnapshot()).toEqual({
			status: "undoable",
			arg: "a",
			deadline: Date.now() + 5000,
		});
		expect(onSuccess).toHaveBeenCalledWith("a");
	});

	it("reports a failed execute and never becomes undoable", async () => {
		const error = new Error("network");
		const { controller, onError, onSuccess } = setup({
			execute: () => Promise.reject(error),
		});

		await controller.execute("a");

		expect(controller.getSnapshot()).toEqual({
			status: "executeFailed",
			arg: "a",
			error,
		});
		expect(onError).toHaveBeenCalledWith(error, {
			phase: "execute",
			arg: "a",
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("ignores execute while one is already running", async () => {
		const op = deferred();
		const execute = vi.fn(() => op.promise);
		const { controller } = setup({ execute });

		controller.execute("a");
		controller.execute("b");

		expect(execute).toHaveBeenCalledTimes(1);
		expect(controller.getSnapshot()).toMatchObject({ arg: "a" });
	});
});

describe("undo", () => {
	it("calls undo with the original arg", async () => {
		const { controller, undo, onUndo } = setup();
		await controller.execute("a");

		await controller.undo();

		expect(undo).toHaveBeenCalledWith("a");
		expect(controller.getSnapshot()).toEqual({ status: "undone", arg: "a" });
		expect(onUndo).toHaveBeenCalledWith("a");
	});

	it("is refused once the deadline has passed, even if the timer hasn't fired", async () => {
		const { controller, undo } = setup();
		await controller.execute("a");

		// Move the clock without running timers, like a throttled background tab.
		vi.setSystemTime(Date.now() + 5000);
		await controller.undo();

		expect(undo).not.toHaveBeenCalled();
		expect(controller.getSnapshot()).toEqual({ status: "expired", arg: "a" });
	});

	it("finishes an undo that started before the deadline", async () => {
		const op = deferred();
		const { controller } = setup({ undo: () => op.promise });
		await controller.execute("a");

		const pending = controller.undo();
		vi.advanceTimersByTime(10_000);
		expect(controller.getSnapshot()).toMatchObject({ status: "undoing" });

		op.resolve();
		await pending;
		expect(controller.getSnapshot()).toEqual({ status: "undone", arg: "a" });
	});

	it("allows a retry after a failed undo while the window is open", async () => {
		const error = new Error("network");
		const undo = vi
			.fn<(arg: string) => Promise<void>>()
			.mockRejectedValueOnce(error)
			.mockResolvedValueOnce(undefined);
		const { controller, onError, onUndo } = setup({ undo });
		await controller.execute("a");

		await controller.undo();
		expect(controller.getSnapshot()).toMatchObject({
			status: "undoFailed",
			error,
		});
		expect(onError).toHaveBeenCalledWith(error, { phase: "undo", arg: "a" });
		expect(onUndo).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1000);
		await controller.undo();

		expect(undo).toHaveBeenCalledTimes(2);
		expect(controller.getSnapshot()).toEqual({ status: "undone", arg: "a" });
	});

	it("expires after a failed undo once the window closes", async () => {
		const { controller } = setup({
			undo: () => Promise.reject(new Error("network")),
		});
		await controller.execute("a");
		await controller.undo();

		vi.advanceTimersByTime(5000);

		expect(controller.getSnapshot()).toEqual({ status: "expired", arg: "a" });
	});
});

describe("expiry and dismiss", () => {
	it("expires when the duration is up", async () => {
		const { controller } = setup();
		await controller.execute("a");

		vi.advanceTimersByTime(4999);
		expect(controller.getSnapshot()).toMatchObject({ status: "undoable" });

		vi.advanceTimersByTime(1);
		expect(controller.getSnapshot()).toEqual({ status: "expired", arg: "a" });
	});

	it("dismiss closes the window and the timer no longer changes state", async () => {
		const { controller } = setup();
		await controller.execute("a");

		controller.dismiss();
		vi.advanceTimersByTime(5000);

		expect(controller.getSnapshot()).toEqual({ status: "dismissed", arg: "a" });
	});
});

describe("races", () => {
	it("an old action's timer doesn't close the new action's window", async () => {
		const { controller } = setup();
		await controller.execute("a");
		vi.advanceTimersByTime(3000);
		await controller.execute("b");

		// A's 5s are up here. B should still be undoable.
		vi.advanceTimersByTime(2500);
		expect(controller.getSnapshot()).toMatchObject({
			status: "undoable",
			arg: "b",
		});

		vi.advanceTimersByTime(2500);
		expect(controller.getSnapshot()).toEqual({ status: "expired", arg: "b" });
	});

	it("ignores results that arrive after dispose", async () => {
		const op = deferred();
		const { controller, onSuccess } = setup({ execute: () => op.promise });

		const pending = controller.execute("a");
		controller.dispose();
		op.resolve();
		await pending;

		expect(controller.getSnapshot()).toMatchObject({ status: "executing" });
		expect(onSuccess).not.toHaveBeenCalled();
	});
});

describe("subscribe", () => {
	it("notifies listeners until they unsubscribe", async () => {
		const { controller } = setup();
		const listener = vi.fn();
		const unsubscribe = controller.subscribe(listener);

		await controller.execute("a");
		expect(listener).toHaveBeenCalledTimes(2); // executing, undoable

		unsubscribe();
		controller.dismiss();
		expect(listener).toHaveBeenCalledTimes(2);
	});
});

describe("options", () => {
	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		"rejects duration %s",
		(duration) => {
			expect(() => setup({ duration })).toThrow(RangeError);
		},
	);
});
