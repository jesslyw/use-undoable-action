import "./App.css";
import ItemList, { type Item } from "./components/ItemList";
import PageContainer from "./components/PageContainer";
import { Toaster } from "./components/ui/toast";

const items: Item[] = [
  { id: "1", name: "item 1", deleted: false },
  { id: "2", name: "item 2", deleted: false },
];

function App() {
  return (
    <PageContainer>
      <ItemList items={items} />
      <Toaster />
    </PageContainer>
  );
}

export default App;
