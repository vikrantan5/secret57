import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Escapes a CSV field per RFC 4180.
 * Wraps the value in quotes if it contains a comma, newline, or double quote,
 * and escapes embedded double quotes by doubling them.
 */
const escapeCsvField = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Builds CSV content from an array of header keys and an array of row objects.
 * Each header is the column label; rows are keyed by the same labels OR by a getter.
 */
export const buildCsv = (
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string => {
  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map(row => row.map(escapeCsvField).join(','));
  // Prepend BOM so Excel renders UTF-8 (₹, etc.) correctly
  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
};

/**
 * Cross-platform CSV download/share.
 * - Web: triggers a browser download via a Blob + anchor click
 * - Native (iOS/Android): writes the file and opens the share sheet
 */
export const downloadCsv = async (filename: string, csvContent: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Browser download path
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }

    // Native path
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDir) {
      throw new Error('No writable directory available on this device');
    }
    const fileUri = baseDir + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Saved', `File saved to ${fileUri}`);
    }
  } catch (err: any) {
    console.error('CSV download error:', err);
    Alert.alert('Export failed', err?.message || 'Could not export CSV');
  }
};

/**
 * Convenience: build + download in one call.
 */
export const exportRowsToCsv = async (
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) => {
  const content = buildCsv(headers, rows);
  await downloadCsv(filename, content);
};

/**
 * Format a date value for CSV.
 */
export const csvDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  try {
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return '';
  }
};