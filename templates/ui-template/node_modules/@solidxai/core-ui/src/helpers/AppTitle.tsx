export const AppTitle = ({ title }: { title: any }) => {
    const appTitle = title ? title?.data?.appTitle : "Solid Starters";
    return (
        <div>
            <p className="solid-logo-title">
                {appTitle?.split(" ").map((word: string, index: number) => (
                    <div key={index}>{word}</div>
                ))}
            </p>
        </div>
    )
}