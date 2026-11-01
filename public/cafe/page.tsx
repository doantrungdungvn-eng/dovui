export default function CafePage() {
  return (
    <main
      style={{
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      <iframe
        src="/cafe/index.html"
        title="Café 247"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          border: 0,
        }}
        allow="autoplay; fullscreen"
      />
    </main>
  );
}
