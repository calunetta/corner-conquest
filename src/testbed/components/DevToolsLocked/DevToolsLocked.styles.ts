export const styles = {
  page: 'mx-auto mt-12 max-w-md px-4',
  title: 'text-xl font-semibold',
  intro: 'mt-2 text-sm text-muted-foreground',
  form: 'mt-6 flex flex-col gap-3',
  label: 'text-sm font-medium',
  input: 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
  submit: 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50',
  error: 'mt-4 text-sm text-destructive',
} as const;
