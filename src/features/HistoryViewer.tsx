import { useEffect, useState } from "react";
import { useHistoryStore } from "../state/historyStore";
import { DateTime } from "luxon";
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  X
} from "lucide-react";
import "./HistoryViewer.css";

interface HistoryViewerProps {
  onClose: () => void;
}

export function HistoryViewer({ onClose }: HistoryViewerProps) {
  const {
    monthDays,
    selectedDay,
    items,
    searchQuery,
    loading,
    error,
    currentMonth,
    totalCount,
    loadMonthDays,
    selectDay,
    searchInDay,
    searchAll,
    clearSearch,
    navigateMonth,
    loadTotalCount
  } = useHistoryStore();
  
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [searchMode, setSearchMode] = useState<"day" | "all">("day");

  useEffect(() => {
    // Load initial data
    loadMonthDays(currentMonth.year, currentMonth.month);
    loadTotalCount();
  }, []);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleDayClick = (date: string) => {
    selectDay(date);
    setSearchMode("day");
    clearSearch();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === "day" && selectedDay) {
      searchInDay(localSearch);
    } else {
      searchAll(localSearch);
    }
  };

  const handleSearchModeChange = (mode: "day" | "all") => {
    setSearchMode(mode);
    clearSearch();
    setLocalSearch("");
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

  const groupItemsBySource = () => {
    const grouped = {
      TODAY: items.filter(item => item.sourceList === "TODAY"),
      FUTURE: items.filter(item => item.sourceList === "FUTURE")
    };
    return grouped;
  };

  const daysInMonth = getDaysInMonth();
  const groupedItems = groupItemsBySource();

  return (
    <div className="history-viewer">
      <div className="history-wrapper">
        <div className="history-header">
          <button className="back-button" onClick={onClose} aria-label="Back to tasks">
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>
          <h2>History</h2>
          <div className="history-stats">
            <span>{totalCount} tasks</span>
          </div>
        </div>

        <div className="history-content">
        <div className="history-controls">
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder={searchMode === "day" && !selectedDay ? "Select a day first..." : "Search tasks..."}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              disabled={searchMode === "day" && !selectedDay}
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
          
          <div className="search-mode">
            <button
              className={`mode-button ${searchMode === "day" ? "active" : ""}`}
              onClick={() => handleSearchModeChange("day")}
            >
              Current Day
            </button>
            <button
              className={`mode-button ${searchMode === "all" ? "active" : ""}`}
              onClick={() => handleSearchModeChange("all")}
            >
              All History
            </button>
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
          {loading && (
            <div className="history-loading">Loading...</div>
          )}

          {error && (
            <div className="history-error">{error}</div>
          )}

          {!loading && !error && selectedDay && (
            <div className="history-day-content">
              <h3 className="day-header">{formatDate(selectedDay)}</h3>
              
              {items.length === 0 ? (
                <div className="history-empty">
                  {searchQuery ? "No tasks found matching your search." : "No tasks archived on this day."}
                </div>
              ) : (
                <div className="history-groups">
                  {groupedItems.TODAY.length > 0 && (
                    <div className="history-group">
                      <h4>From Today ({groupedItems.TODAY.length})</h4>
                      <div className="history-items">
                        {groupedItems.TODAY.map(item => (
                          <div key={item.id} className="history-item">
                            <CheckCircle size={16} className="history-item-icon" />
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
                    </div>
                  )}
                  
                  {groupedItems.FUTURE.length > 0 && (
                    <div className="history-group">
                      <h4>From Future ({groupedItems.FUTURE.length})</h4>
                      <div className="history-items">
                        {groupedItems.FUTURE.map(item => (
                          <div key={item.id} className="history-item">
                            <CheckCircle size={16} className="history-item-icon" />
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
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !error && searchMode === "all" && searchQuery && (
            <div className="history-search-results">
              <h3 className="results-header">Search Results ({items.length})</h3>
              {items.length === 0 ? (
                <div className="history-empty">No tasks found matching your search.</div>
              ) : (
                <div className="history-items">
                  {items.map(item => (
                    <div key={item.id} className="history-item with-date">
                      <div className="history-item-main">
                        <CheckCircle size={16} className="history-item-icon" />
                        <span className="history-item-title">{item.title}</span>
                      </div>
                      <div className="history-item-meta">
                        <span className="history-item-date">
                          <Calendar size={12} />
                          {DateTime.fromISO(item.clearedOn).toFormat("MMM d, yyyy")}
                        </span>
                        <span className="history-item-source">{item.sourceList}</span>
                        {item.completedAt && (
                          <span className="history-item-time">
                            <Clock size={12} />
                            {formatTime(item.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDay && searchMode === "day" && !searchQuery && (
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