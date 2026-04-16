import { useState } from "react";

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterPriority: (priority: string) => void;
  onFilterCategory: (category: string) => void;
  onSort: (sortBy: string) => void;
  totalTodos: number;
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-zinc-500">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function SearchFilter({ onSearch, onFilterPriority, onFilterCategory, onSort, totalTodos }: SearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activePriority, setActivePriority] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [activeSort, setActiveSort] = useState("dueDate");

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    onSearch(val);
  };

  const handlePriority = (val: string) => {
    const next = activePriority === val ? "" : val;
    setActivePriority(next);
    onFilterPriority(next);
  };

  const handleCategory = (val: string) => {
    const next = activeCategory === val ? "" : val;
    setActiveCategory(next);
    onFilterCategory(next);
  };

  const handleSort = (val: string) => {
    setActiveSort(val);
    onSort(val);
  };

  const priorities = [
    { value: "high",   label: "High",   color: "text-red-400 border-red-500/40 bg-red-500/10" },
    { value: "medium", label: "Med",    color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
    { value: "low",    label: "Low",    color: "text-green-400 border-green-500/40 bg-green-500/10" },
  ];

  const sorts = [
    { value: "dueDate",  label: "Due date" },
    { value: "priority", label: "Priority" },
    { value: "newest",   label: "Newest" },
    { value: "oldest",   label: "Oldest" },
  ];

  const hasActiveFilters = activePriority || activeCategory;

  return (
    <div className="space-y-3">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
            showFilters || hasActiveFilters
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          <FilterIcon />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
              {(activePriority ? 1 : 0) + (activeCategory ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-4">
          {/* Priority pills */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Priority</p>
            <div className="flex gap-2">
              {priorities.map(p => (
                <button
                  key={p.value}
                  onClick={() => handlePriority(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activePriority === p.value
                      ? p.color
                      : "text-zinc-500 bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {activePriority && (
                <button
                  onClick={() => handlePriority("")}
                  className="px-2 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {["work", "personal", "shopping", "health", "general"].map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    activeCategory === cat
                      ? "bg-zinc-600 text-zinc-100 border-zinc-500"
                      : "text-zinc-500 bg-zinc-800 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Sort by</p>
            <div className="flex gap-2">
              {sorts.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleSort(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    activeSort === s.value
                      ? "bg-zinc-600 text-zinc-100 border-zinc-500"
                      : "text-zinc-500 bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
