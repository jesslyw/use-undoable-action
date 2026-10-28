import { useUndoableAction } from "action-lifecycle";
import { ListX, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
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

type Props = { failDelete?: boolean; failUndo?: boolean; slow?: boolean };

function ItemList({
  failDelete = false,
  failUndo = false,
  slow = false,
}: Props) {
  const [getItems, setItems] = useState<Item[]>([]);

  // read by the demo API to simulate failures and a slow network
  const simHeaders = (fail: boolean) => {
    const headers: Record<string, string> = {};
    if (fail) headers["x-fail"] = "1";
    if (slow) headers["x-slow"] = "1";
    return headers;
  };

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
    const res = await fetch(`/api/items/${id}`, {
      method: "DELETE",
      headers: simHeaders(failDelete),
    });
    if (!res.ok) throw new Error("failed to delete");
    setDeleted(id, true);
  };

  const restoreItem = async (id: string) => {
    const res = await fetch(`/api/items/${id}/restore`, {
      method: "POST",
      headers: simHeaders(failUndo),
    });
    if (!res.ok) throw new Error("failed to restore");
    setDeleted(id, false);
  };

  const reset = async () => {
    const res = await fetch("/api/reset", { method: "POST" });
    if (!res.ok) throw new Error("failed to reset");
    const data = await res.json();
    setItems(data);
  };

  const { state, execute, undo, dismiss } = useUndoableAction({
    execute: deleteItem,
    undo: restoreItem,
  });

  useEffect(() => {
    if (
      state.status === "undoable" ||
      state.status === "undoFailed" ||
      state.status === "executeFailed"
    ) {
      const item = getItems.find((e) => e.id === state.arg);

      if (state.status == "executeFailed") {
        const id = toast.add({
          type: "error",
          description: `Failed to delete ${item?.name}`,
          onClose: dismiss,
          timeout: 0,
        });
        return () => toast.close(id);
      }

      // the error stays after the undo window ends, until closed.
      if (state.status === "undoFailed") {
        toast.add({
          type: "error",
          description: `Couldn't restore ${item?.name}`,
          onClose: dismiss,
          timeout: 0,
        });
        return;
      }

      if (state.status == "undoable") {
        const id = toast.add({
          description: `${item?.name} deleted`,
          actionProps: { children: "Undo", onClick: undo },
          onClose: dismiss,
          timeout: 0,
        });
        return () => toast.close(id);
      }
    } else return;
  }, [state, undo, dismiss, getItems]);

  const visible = getItems.filter((item) => !item.deleted);

  return visible.length === 0 ? (
    <Empty className="border border-muted-foreground/40 py-12">
      <EmptyHeader>
        <EmptyTitle>All items deleted</EmptyTitle>
        <EmptyDescription>
          Reset the list to bring them back and try again.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" className="px-4" onClick={reset}>
          <RotateCcw data-icon="inline-start" />
          Reset list
        </Button>
      </EmptyContent>
    </Empty>
  ) : (
    visible.map((item) => {
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
    })
  );
}

export default ItemList;
