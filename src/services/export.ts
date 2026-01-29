/**
 * GreenSense AR - Data Export Service
 * 
 * Export user data as CSV or JSON for backup and analysis.
 */

import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ScanRecord, HistorySummary } from '../types/carbon';
import { Trip } from './location';
import { getScanHistory, getHistorySummary } from './storage';
import { getTripHistory } from './location';

/**
 * Export format type
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export options
 */
export interface ExportOptions {
  includeScans: boolean;
  includeTrips: boolean;
  includeSummary: boolean;
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Exported data structure
 */
export interface ExportedData {
  exportDate: string;
  appVersion: string;
  summary?: HistorySummary;
  scans?: ScanRecord[];
  trips?: Trip[];
}

/**
 * Convert scans to CSV format
 */
function scansToCSV(scans: ScanRecord[]): string {
  const headers = ['Date', 'Time', 'Objects', 'Total Carbon (kg)', 'Object Details'];
  const rows = scans.map(scan => {
    const date = new Date(scan.timestamp);
    const objects = scan.objects.map(o => `${o.name} (${o.carbonKg}kg)`).join('; ');
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      scan.objects.length.toString(),
      scan.totalCarbonKg.toFixed(2),
      `"${objects}"`,
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert trips to CSV format
 */
function tripsToCSV(trips: Trip[]): string {
  const headers = [
    'Date',
    'Start Time',
    'End Time',
    'Duration (min)',
    'Distance (km)',
    'Mode',
    'Confirmed Mode',
    'Carbon (kg)',
    'Avg Speed (km/h)',
  ];
  
  const rows = trips.map(trip => {
    const startDate = new Date(trip.startTime);
    const endDate = trip.endTime ? new Date(trip.endTime) : null;
    return [
      startDate.toLocaleDateString(),
      startDate.toLocaleTimeString(),
      endDate ? endDate.toLocaleTimeString() : 'N/A',
      trip.durationMinutes.toFixed(1),
      trip.distanceKm.toFixed(2),
      trip.detectedMode,
      trip.confirmedMode || 'Not confirmed',
      trip.carbonKg.toFixed(3),
      trip.averageSpeedKmh.toFixed(1),
    ].join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert summary to CSV format
 */
function summaryToCSV(summary: HistorySummary): string {
  return [
    'Metric,Value',
    `Total Scans,${summary.totalScans}`,
    `Total Objects,${summary.totalObjects}`,
    `Total Carbon (kg),${summary.totalCarbonKg.toFixed(2)}`,
    `Avg Carbon per Scan (kg),${summary.averageCarbonPerScan.toFixed(2)}`,
    `Top Objects,"${summary.topObjectTypes.join('; ')}"`,
  ].join('\n');
}

/**
 * Generate export file name
 */
function generateFileName(format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `greensense-export-${date}.${format}`;
}

/**
 * Export data to file
 */
export async function exportData(options: ExportOptions): Promise<string | null> {
  try {
    const data: ExportedData = {
      exportDate: new Date().toISOString(),
      appVersion: '2.0.0',
    };

    // Gather data
    if (options.includeSummary) {
      data.summary = await getHistorySummary();
    }

    if (options.includeScans) {
      let scans = await getScanHistory();
      
      // Filter by date range if provided
      if (options.dateRange) {
        scans = scans.filter(scan => {
          const scanDate = new Date(scan.timestamp);
          return scanDate >= options.dateRange!.start && scanDate <= options.dateRange!.end;
        });
      }
      
      data.scans = scans;
    }

    if (options.includeTrips) {
      let trips = await getTripHistory();
      
      // Filter by date range if provided
      if (options.dateRange) {
        trips = trips.filter(trip => {
          const tripDate = new Date(trip.startTime);
          return tripDate >= options.dateRange!.start && tripDate <= options.dateRange!.end;
        });
      }
      
      data.trips = trips;
    }

    // Generate file content
    let content: string;
    const fileName = generateFileName(options.format);
    
    if (options.format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      // CSV format - combine all sections
      const sections: string[] = [];
      
      sections.push('=== GreenSense AR Data Export ===');
      sections.push(`Export Date: ${data.exportDate}`);
      sections.push('');
      
      if (data.summary) {
        sections.push('=== Summary ===');
        sections.push(summaryToCSV(data.summary));
        sections.push('');
      }
      
      if (data.scans && data.scans.length > 0) {
        sections.push('=== Scans ===');
        sections.push(scansToCSV(data.scans));
        sections.push('');
      }
      
      if (data.trips && data.trips.length > 0) {
        sections.push('=== Trips ===');
        sections.push(tripsToCSV(data.trips));
        sections.push('');
      }
      
      content = sections.join('\n');
    }

    // Write to file in cache directory using new File API
    const file = new File(Paths.cache, fileName);
    await file.write(content);

    return file.uri;
  } catch (error) {
    console.error('Error exporting data:', error);
    return null;
  }
}

/**
 * Share exported file
 */
export async function shareExport(fileUri: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      console.log('Sharing is not available on this device');
      return false;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: fileUri.endsWith('.json') ? 'application/json' : 'text/csv',
      dialogTitle: 'Export GreenSense Data',
    });

    return true;
  } catch (error) {
    console.error('Error sharing export:', error);
    return false;
  }
}

/**
 * Quick export - exports all data as JSON and shares
 */
export async function quickExport(): Promise<boolean> {
  const fileUri = await exportData({
    includeScans: true,
    includeTrips: true,
    includeSummary: true,
    format: 'json',
  });

  if (!fileUri) return false;
  return await shareExport(fileUri);
}

/**
 * Export as CSV and share
 */
export async function exportAsCSV(): Promise<boolean> {
  const fileUri = await exportData({
    includeScans: true,
    includeTrips: true,
    includeSummary: true,
    format: 'csv',
  });

  if (!fileUri) return false;
  return await shareExport(fileUri);
}

export default {
  exportData,
  shareExport,
  quickExport,
  exportAsCSV,
};

