// page wrapper with padding and spacing between children
function PageContainer({ children }: { children: React.ReactNode }) {
	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
			{children}
		</div>
	);
}

export default PageContainer;
