// Browser stand-in for node:fs/promises. Only file-writing code paths touch
// it, and the site never calls those.
const unavailable = (): never => {
  throw new Error('node:fs is not available in the browser');
};
export default { readFile: unavailable, writeFile: unavailable, mkdir: unavailable };
