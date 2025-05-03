/**
 * DateFormatService - A utility class for consistent date formatting across the application
 * 
 * This service provides standardized methods for formatting dates in various contexts:
 * - Standard date format with dots (DD.MM.YYYY)
 * - Time display (HH:MM in 24-hour format)
 * - Relative date formatting (Today, Yesterday, etc.)
 * - Date with time
 */
export class DateFormatService {
  /**
   * Format a date in the standard European format with dots (DD.MM.YYYY)
   */
  public static formatStandardDate(date: Date | string | undefined): string {
    if (!date) return 'Unknown date';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date:', date);
        return 'Invalid date';
      }
      
      // Format as DD.MM.YYYY (European format with dots)
      return dateObj.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '.');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Error formatting date';
    }
  }
  
  /**
   * Format time only in 24-hour format (HH:MM)
   */
  public static formatTime(date: Date | string | undefined): string {
    if (!date) return 'Unknown time';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date for time formatting:', date);
        return 'Invalid time';
      }
      
      // Format as HH:MM (24-hour)
      return dateObj.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (err) {
      console.error('Error formatting time:', err);
      return 'Error formatting time';
    }
  }
  
  /**
   * Format date with time (DD.MM.YYYY, HH:MM)
   */
  public static formatDateWithTime(date: Date | string | undefined): string {
    if (!date) return 'Unknown date/time';
    
    try {
      return `${this.formatStandardDate(date)}, ${this.formatTime(date)}`;
    } catch (err) {
      console.error('Error formatting date with time:', err);
      return 'Error formatting date/time';
    }
  }
  
  /**
   * Format date as a relative label (Today, Yesterday, Monday, etc. or DD.MM.YYYY for older dates)
   */
  public static formatRelativeDate(date: Date | string | undefined): string {
    if (!date) return 'Unknown date';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date for relative formatting:', date);
        return 'Invalid date';
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 6); // 6 days ago + today = 7 days
      
      const inputDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      
      // Define day names
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      if (inputDate.getTime() === today.getTime()) {
        return 'Today';
      } else if (inputDate.getTime() === yesterday.getTime()) {
        return 'Yesterday';
      } else if (inputDate >= oneWeekAgo) {
        return weekdays[inputDate.getDay()];
      } else {
        return this.formatStandardDate(dateObj);
      }
    } catch (err) {
      console.error('Error formatting relative date:', err);
      return 'Error formatting date';
    }
  }
  
  /**
   * Format a date for display in contact lists or request lists (DD.MM.YYYY)
   */
  public static formatContactDate(date: Date | string | undefined): string {
    return this.formatStandardDate(date);
  }
  
  /**
   * Format a timestamp for display in chat messages (HH:MM only)
   */
  public static formatMessageTime(date: Date | string | undefined): string {
    return this.formatTime(date);
  }
  
  /**
   * Format a date to display as creation/addition date (DD.MM.YYYY)
   */
  public static formatCreationDate(date: Date | string | undefined): string {
    return this.formatStandardDate(date);
  }
}
