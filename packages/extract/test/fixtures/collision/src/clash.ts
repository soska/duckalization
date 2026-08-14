declare function __(message: string, options?: Record<string, unknown>): string;

export const a = __('Save', { id: 'shared.id' });
export const b = __('Delete', { id: 'shared.id' });
