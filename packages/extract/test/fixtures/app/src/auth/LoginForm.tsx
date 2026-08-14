declare function __(message: string | Record<string, string>, options?: Record<string, unknown>): string;

export function LoginForm({ name }: { name: string }) {
  return (
    <form>
      <h1>{__('Sign in')}</h1>
      <p>{__('Welcome back, {name}', { name })}</p>
      <button type="submit">{__('Sign in')}</button>
      <a href="/book">{__('Book', { context: 'verb' })}</a>
      <a href="/library">{__('Book')}</a>
    </form>
  );
}
