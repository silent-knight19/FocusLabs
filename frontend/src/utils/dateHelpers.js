/**
 * Date utility functions for HabitGrid
 */

/**
 * Get the start date of the current week based on start-of-week preference
 * @param {Date} date - Reference date
 * @param {string} startOfWeek - 'sunday' or 'monday'
 * @returns {Date} - Start of week
 */
export function getWeekStart(date = new Date(), startOfWeek = 'sunday') {
  const d = new Date(date);
  const day = d.getDay();
  const diff = startOfWeek === 'monday' 
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get array of 7 dates for the current week
 * @param {Date} date - Reference date
 * @param {string} startOfWeek - 'sunday' or 'monday'
 * @returns {Date[]} - Array of 7 dates
 */
export function getWeekDates(date = new Date(), startOfWeek = 'sunday') {
  const weekStart = getWeekStart(date, startOfWeek);
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  
  return dates;
}

/**
 * Format date as YYYY-MM-DD for storage keys
 * Accepts either a Date instance or a value coercible to Date (e.g. ISO string)
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDateKey(date) {
  // Ensure we always work with a real Date instance
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Nov 21")
 * @param {Date} date
 * @returns {string}
 */
export function formatDateDisplay(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Get day name abbreviation
 * @param {Date} date
 * @returns {string}
 */
export function getDayName(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

/**
 * Get current month and year for display
 * @param {Date} date
 * @returns {string}
 */
export function getMonthYear(date = new Date()) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const getMonthDates = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const dates = [];
  
  // Add days from previous month to fill first week
  const firstDayIndex = firstDay.getDay(); // 0 = Sunday
  for (let i = firstDayIndex; i > 0; i--) {
    const prevDate = new Date(year, month, 1 - i);
    dates.push(prevDate);
  }
  
  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i));
  }
  
  // Add days from next month to fill last week (grid of 42 cells usually covers all months)
  const remainingCells = 42 - dates.length;
  for (let i = 1; i <= remainingCells; i++) {
    dates.push(new Date(year, month + 1, i));
  }
  
  return dates;
};

/**
 * Get all days in the current month (1st to last day)
 * @param {Date} date - Reference date
 * @returns {Date[]} - Array of dates for the month
 */
export function getCurrentMonthDates(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push(new Date(year, month, i));
  }
  
  return dates;
}

export const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

export const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const getTwoYearsAgo = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date;
};

export const isWithinTwoYears = (date) => {
  const twoYearsAgo = getTwoYearsAgo();
  const today = new Date();
  // Allow viewing slightly into the future (e.g. end of current year)
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  
  return date >= twoYearsAgo && date <= nextYear;
};

/**
 * Get today's date with time set to midnight
 * @returns {Date}
 */
export function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Convert 24h time string (HH:MM) to 12h format (h:MM AM/PM)
 * @param {string} timeStr - "14:30"
 * @returns {string} - "2:30 PM"
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}
