import "./App.css";
import ItemList from "./components/ItemList";
import PageContainer from "./components/PageContainer";
import { Toaster } from "./components/ui/toast";

function App() {
  return (
    <PageContainer>
      <ItemList />
      <Toaster />
    </PageContainer>
  );
}

export default App;
