export function PolicyBody({ body }: { body: string }) {
  return <>{body.trim().split(/\n\s*\n/).map((section, index) => {
    const text = section.trim();
    if (!text) return null;
    if (text.startsWith("## ")) {
      const [heading, ...lines] = text.split("\n");
      return <section key={index}>
        <h2>{heading.slice(3).trim()}</h2>
        {lines.length ? <p>{lines.join("\n").trim()}</p> : null}
      </section>;
    }
    return <p key={index}>{text}</p>;
  })}</>;
}
