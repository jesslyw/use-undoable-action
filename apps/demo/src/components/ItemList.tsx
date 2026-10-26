import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "./ui/item";
import { useUndoableAction } from "action-lifecycle";
import { toast } from "./ui/toast";
import { Spinner } from "./ui/spinner";

export type Item = { id: string; name: string; deleted: boolean };

function ItemList({ items }: { items: Item[] }) {
  const [getItems, setItems] = useState<Item[]>(items);

  const deleteItem = async (item: Item) => {
    const updatedItems = getItems.filter((e) => e.id !== item.id);
    setItems(updatedItems);
    console.log(item, "deleted");
    console.log("new list:", getItems);
  };

  const restoreItem = async (item: Item) => {
    getItems.push(item);
  };

  const { state, execute, undo, dismiss } = useUndoableAction({
    execute: deleteItem,
    undo: restoreItem,
  });

  useEffect(() => {
    if (state.status !== "undoable") return;

    const id = toast.add({
      description: `${state.arg.name} deleted`,
      actionProps: { children: "Undo", onClick: undo },
      onClose: dismiss,
      timeout: 0,
    });
    return () => toast.close(id);
  }, [state, undo, dismiss]);

  return getItems.map((item) => {
    const isDeleting = state.status === "executing" && state.arg === item;

    return (
      <Item key={item.id} variant="outline">
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
            onClick={() => execute(item)}
          >
            {isDeleting && <Spinner />}
            Delete
          </Button>
        </ItemActions>
      </Item>
    );
  });
}

export default ItemList;
