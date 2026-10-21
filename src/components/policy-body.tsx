export function PolicyBody({ body }: { body: string }) {
  return <>{body.trim().split(/\n\s*\n/).map((section, index) => {
    const text = section.trim();
    if (!text) return null;
    if (text.startsWith("## ")) return <h2 key={index}>{text.slice(3)}</h2>;
    return <p key={index}>{text}</p>;
  })}</>;
}
