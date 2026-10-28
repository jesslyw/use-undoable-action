import { Turtle } from "lucide-react";
import { useState } from "react";
import "./App.css";
import ItemList from "./components/ItemList";
import PageContainer from "./components/PageContainer";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import { Toaster } from "./components/ui/toast";
import { Toggle } from "./components/ui/toggle";

function App() {
	const [failDelete, setFailDelete] = useState(false);
	const [failUndo, setFailUndo] = useState(false);
	const [slow, setSlow] = useState(false);

	return (
		<PageContainer>
			<div className="flex items-center gap-6 text-sm">
				<span className="text-muted-foreground">Simulate</span>
				<div className="flex items-center gap-2">
					<Switch
						id="delete-fails"
						checked={failDelete}
						onCheckedChange={setFailDelete}
					/>
					<Label htmlFor="delete-fails">Delete fails</Label>
				</div>
				<div className="flex items-center gap-2">
					<Switch
						id="undo-fails"
						checked={failUndo}
						onCheckedChange={setFailUndo}
					/>
					<Label htmlFor="undo-fails">Undo fails</Label>
				</div>
				<Toggle
					variant="outline"
					size="sm"
					className="flex-1 aria-pressed:bg-pink-100"
					pressed={slow}
					onPressedChange={setSlow}
				>
					<Turtle />
					Slow network
				</Toggle>
			</div>
			<ItemList failDelete={failDelete} failUndo={failUndo} slow={slow} />
			<Toaster />
		</PageContainer>
	);
}

export default App;
