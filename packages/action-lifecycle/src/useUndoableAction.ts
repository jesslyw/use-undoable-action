import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { UndoableActionController } from "./controller";
import type { Options, State } from "./types";

export type UndoableAction<TArg> = {
	state: State<TArg>;
	execute: (arg: TArg) => Promise<void>;
	undo: () => Promise<void>;
	dismiss: () => void;
};

export function useUndoableAction<TArg>(
	options: Options<TArg>,
): UndoableAction<TArg> {
	// Options are a new object on every render. The controller reads them
	// through this ref, so it always calls the latest callbacks.
	const optionsRef = useRef(options);
	useLayoutEffect(() => {
		optionsRef.current = options;
	});

	// Created once per component. duration is read only at this point.
	const [controller] = useState(
		() =>
			new UndoableActionController<TArg>({
				duration: options.duration,
				execute: (arg) => optionsRef.current.execute(arg),
				undo: (arg) => optionsRef.current.undo(arg),
				onSuccess: (arg) => optionsRef.current.onSuccess?.(arg),
				onUndo: (arg) => optionsRef.current.onUndo?.(arg),
				onError: (error, context) =>
					optionsRef.current.onError?.(error, context),
			}),
	);

	useEffect(() => controller.dispose, [controller]);

	const state: State<TArg> = useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot,
	);

	return {
		state,
		execute: controller.execute,
		undo: controller.undo,
		dismiss: controller.dismiss,
	};
}
