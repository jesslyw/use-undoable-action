// page wrapper with padding and spacing between children
import "./PageContainer.css";

function PageContainer({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-col gap-4 p-6">{children}</div>;
}

export default PageContainer;
