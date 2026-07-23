"use client";

import { Filter, Search } from "lucide-react";

export function RecordToolbar({
  placeholder,
  value,
  onChange,
  children,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="toolbar">
      <label className="search-box">
        <Search color="#667085" size={17} />
        <span className="sr-only">Search</span>
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          value={value}
        />
      </label>
      {children}
      <button className="button button-secondary" type="button">
        <Filter size={16} />
        Filter
      </button>
    </div>
  );
}
