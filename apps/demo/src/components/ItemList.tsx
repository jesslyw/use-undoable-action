import { useUndoableAction } from "action-lifecycle";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
	ItemActions,
	ItemContent,
	ItemDescription,
	Item as ItemRow,
	ItemTitle,
} from "./ui/item";
import { Spinner } from "./ui/spinner";
import { toast } from "./ui/toast";

export type Item = { id: string; name: string; deleted: boolean };

function ItemList() {
	const [getItems, setItems] = useState<Item[]>([]);

	useEffect(() => {
		const load = async () => {
			const res = await fetch("/api/items");
			const data = await res.json();
			setItems(data);
		};
		load();
	}, []);
	const setDeleted = (id: string, deleted: boolean) =>
		setItems((xs) => xs.map((x) => (x.id === id ? { ...x, deleted } : x)));

	const deleteItem = async (id: string) => {
		const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
		if (!res.ok) throw new Error("failed to delete");
		setDeleted(id, true);
		const data = await res.json();
		return data;
	};

	const restoreItem = async (id: string) => {
		const res = await fetch(`/api/items/${id}/restore`, { method: "POST" });
		if (!res.ok) throw new Error("failed to restore");

		setDeleted(id, false);
		const data = await res.json();
		return data;
	};

	const { state, execute, undo, dismiss } = useUndoableAction({
		execute: deleteItem,
		undo: restoreItem,
	});

	useEffect(() => {
		if (state.status !== "undoable") return;
		const item = getItems.find((e) => e.id === state.arg);

		const id = toast.add({
			description: `${item?.name} deleted`,
			actionProps: { children: "Undo", onClick: undo },
			onClose: dismiss,
			timeout: 0,
		});
		return () => toast.close(id);
	}, [state, undo, dismiss, getItems]);

	return getItems
		.filter((item) => !item.deleted)
		.map((item) => {
			const isDeleting = state.status === "executing" && state.arg === item.id;

			return (
				<ItemRow key={item.id} variant="outline">
					<ItemContent>
						<ItemTitle>{item.name}</ItemTitle>
						<ItemDescription>
							A simple item with title and description.
						</ItemDescription>
					</ItemContent>
					<ItemActions>
						<Button
							variant="outline"
							size="sm"
							disabled={isDeleting}
							onClick={() => execute(item.id)}
						>
							{isDeleting && <Spinner />}
							Delete
						</Button>
					</ItemActions>
				</ItemRow>
			);
		});
}

export default ItemList;
