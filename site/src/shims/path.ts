// Browser stand-in for node:path (see fs.ts).
const unavailable = (): never => {
  throw new Error('node:path is not available in the browser');
};
export default { resolve: unavailable, join: unavailable, relative: unavailable, dirname: unavailable };
