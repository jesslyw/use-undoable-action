// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useUndoableAction } from "./useUndoableAction";

describe("useUndoableAction", () => {
	it("re-renders with the controller's state", async () => {
		const { result } = renderHook(() =>
			useUndoableAction({
				execute: vi.fn().mockResolvedValue(undefined),
				undo: vi.fn().mockResolvedValue(undefined),
			}),
		);
		expect(result.current.state).toEqual({ status: "idle" });

		await act(() => result.current.execute("a"));

		expect(result.current.state).toMatchObject({
			status: "undoable",
			arg: "a",
		});
	});

	it("calls the latest callbacks, not the ones from the first render", async () => {
		const first = vi.fn();
		const latest = vi.fn();
		const { result, rerender } = renderHook(
			({ onSuccess }) =>
				useUndoableAction({
					execute: vi.fn().mockResolvedValue(undefined),
					undo: vi.fn().mockResolvedValue(undefined),
					onSuccess,
				}),
			{ initialProps: { onSuccess: first } },
		);

		rerender({ onSuccess: latest });
		await act(() => result.current.execute("a"));

		expect(first).not.toHaveBeenCalled();
		expect(latest).toHaveBeenCalledWith("a");
	});

	it("ignores a result that arrives after unmount", async () => {
		let finish!: () => void;
		const onSuccess = vi.fn();
		const { result, unmount } = renderHook(() =>
			useUndoableAction({
				execute: () =>
					new Promise<void>((resolve) => {
						finish = resolve;
					}),
				undo: vi.fn().mockResolvedValue(undefined),
				onSuccess,
			}),
		);

		let pending!: Promise<void>;
		act(() => {
			pending = result.current.execute("a");
		});
		unmount();
		finish();
		await pending;

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("still works under Strict Mode's mount, unmount, mount", async () => {
		const { result } = renderHook(
			() =>
				useUndoableAction({
					execute: vi.fn().mockResolvedValue(undefined),
					undo: vi.fn().mockResolvedValue(undefined),
				}),
			{ wrapper: StrictMode },
		);

		await act(() => result.current.execute("a"));

		expect(result.current.state).toMatchObject({ status: "undoable" });
	});
});
