import { useEffect, useState } from "react";
import { useHistoryStore } from "../state/historyStore";
import { DateTime } from "luxon";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search,
  Clock,
  X
} from "lucide-react";
import "./HistoryViewer.css";

export function HistoryViewer() {
  const {
    monthDays,
    selectedDay,
    items,
    searchQuery,
    loading,
    error,
    currentMonth,
    loadMonthDays,
    selectDay,
    searchAll,
    clearSearch,
    navigateMonth
  } = useHistoryStore();
  
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    // Load initial data
    loadMonthDays(currentMonth.year, currentMonth.month);
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleDayClick = (date: string) => {
    selectDay(date);
    clearSearch();
    setLocalSearch("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      searchAll(localSearch);
      selectDay(null);
    }
  };


  const formatDate = (dateStr: string) => {
    return DateTime.fromISO(dateStr).toFormat("EEEE, MMMM d, yyyy");
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return DateTime.fromISO(dateStr).toFormat("h:mm a");
  };

  const getDaysInMonth = () => {
    const firstDay = currentMonth.startOf("month");
    const lastDay = currentMonth.endOf("month");
    const startPadding = firstDay.weekday === 7 ? 0 : firstDay.weekday;
    
    const days: (DateTime | null)[] = [];
    
    // Add padding for start of month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add all days in month
    let current = firstDay;
    while (current <= lastDay) {
      days.push(current);
      current = current.plus({ days: 1 });
    }
    
    return days;
  };

  const getHistoryCountForDay = (date: DateTime) => {
    const dateStr = date.toISODate();
    const dayData = monthDays.find(d => d.date === dateStr);
    return dayData?.count || 0;
  };

  const daysInMonth = getDaysInMonth();

  return (
    <div className="history-viewer">
      <div className="history-wrapper">
        <div className="history-content">
        <div className="history-controls">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search all history..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              className="search-input"
            />
            {localSearch && (
              <button 
                className="clear-search"
                onClick={() => {
                  setLocalSearch("");
                  clearSearch();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="calendar-section">
          <div className="calendar-header">
            <button 
              onClick={() => navigateMonth("prev")}
              aria-label="Previous month"
              className="calendar-nav"
            >
              <ChevronLeft size={20} />
            </button>
            <h3>{currentMonth.toFormat("MMMM yyyy")}</h3>
            <button 
              onClick={() => navigateMonth("next")}
              aria-label="Next month"
              className="calendar-nav"
              disabled={currentMonth.startOf("month") >= DateTime.local().startOf("month")}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>
            
            <div className="calendar-days">
              {daysInMonth.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="calendar-day empty" />;
                }
                
                const dateStr = day.toISODate();
                const count = getHistoryCountForDay(day);
                const isSelected = selectedDay === dateStr;
                const isToday = day.hasSame(DateTime.local(), "day");
                const isFuture = day > DateTime.local();
                
                return (
                  <button
                    key={dateStr}
                    className={`calendar-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${count > 0 ? "has-history" : ""}`}
                    onClick={() => handleDayClick(dateStr!)}
                    disabled={isFuture || count === 0}
                    aria-label={`${day.toFormat("MMMM d")}, ${count} tasks`}
                  >
                    <span className="day-number">{day.day}</span>
                    {count > 0 && (
                      <span className="day-count">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Results Section */}
        <div className="history-results">
          {error && (
            <div className="history-error">{error}</div>
          )}

          {!error && selectedDay && (
            <div className="history-day-content">
              <h3 className="day-header">{formatDate(selectedDay)}</h3>
              
              {!loading && (
                <div className="history-items-wrapper" key={selectedDay}>
                  {items.length === 0 ? (
                    <div className="history-empty">
                      {searchQuery ? "No tasks found matching your search." : "No tasks archived on this day."}
                    </div>
                  ) : (
                    <div className="history-items">
                      {items.map(item => (
                        <div key={item.id} className="history-item">
                          <div className="history-checkbox completed">
                            ✓
                          </div>
                          <span className="history-item-title">{item.title}</span>
                          {item.completedAt && (
                            <span className="history-item-time">
                              <Clock size={12} />
                              {formatTime(item.completedAt)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!error && searchQuery && !loading && (
            <div className="history-search-results">
              <h3 className="results-header">Search Results ({items.length})</h3>
              {items.length === 0 ? (
                <div className="history-empty">No tasks found matching your search.</div>
              ) : (
                <div className="history-items search-results">
                  {items.map(item => (
                    <div key={item.id} className="history-item">
                      <div className="history-checkbox completed">
                        ✓
                      </div>
                      <span className="history-item-title">{item.title}</span>
                      <span className="history-item-date">
                        {DateTime.fromISO(item.clearedOn).toFormat("MMM d, yyyy")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDay && !searchQuery && (
            <div className="history-empty">
              Select a day from the calendar to view archived tasks.
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}