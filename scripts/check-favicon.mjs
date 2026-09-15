const res = await fetch("https://acevision-prod.vercel.app");
const html = await res.text();
const iconMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*>/i);
console.log("Has icon link:", !!iconMatch);
if (iconMatch) console.log("Icon link:", iconMatch[0]);
const anyIcon = html.match(/<link[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/gi);
console.log("All icon links:", anyIcon ? anyIcon.length : 0);
if (anyIcon) anyIcon.forEach((l) => console.log(" ", l));
