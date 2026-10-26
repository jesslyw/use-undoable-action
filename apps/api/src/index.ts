import { serve } from "@hono/node-server";
import { type Context, Hono } from "hono";

const app = new Hono();
type Item = { id: string; name: string; deleted: boolean };

const seed: Item[] = ["item 1", "item 2", "item 3"].map((name, i) => ({
	id: String(i + 1),
	name,
	deleted: false,
}));

const items = new Map(seed.map((item) => [item.id, item]));

app.get("/items", (c) => {
	return c.json([...items.values()].filter((e) => !e.deleted));
});

const setDeleted = (c: Context, deleted: boolean) => {
	const id = c.req.param("id");
	if (!id) {
		return c.json({ error: "missing id" }, 400);
	}
	const item = items.get(id);

	if (!item) {
		return c.json({ error: "not found" }, 404);
	}
	item.deleted = deleted;
	return c.json(item);
};

app.delete("/items/:id", (c) => {
	return setDeleted(c, true);
});

app.post("/items/:id/restore", (c) => {
	return setDeleted(c, false);
});

serve(
	{
		fetch: app.fetch,
		port: 3000,
		hostname: process.env.HOST ?? "127.0.0.1",
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
