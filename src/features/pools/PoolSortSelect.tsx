interface SortOption<T extends string> {
  value: T;
  label: string;
}

export function PoolSortSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: Array<SortOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="shrink-0">排序</span>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="field py-2 text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
