/**
 * CarbonSense AR - History Screen
 * 
 * Displays a scrollable list of past scans with the ability to view details.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useHistory } from '../context/HistoryContext';
import { HistoryItem, ScanResultList } from '../components';
import { ScanRecord } from '../types/carbon';
import { Colors, Spacing, BorderRadius, TextStyles, Shadows } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * HistoryScreen Component
 * 
 * Shows all past scans with ability to view detailed results.
 */
export function HistoryScreen() {
  const { history, summary, isLoading, refresh, removeScan, clearAll } = useHistory();
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);
  
  /**
   * Handle scan item press
   */
  const handleScanPress = (scan: ScanRecord) => {
    setSelectedScan(scan);
  };
  
  /**
   * Close detail modal
   */
  const handleCloseDetail = () => {
    setSelectedScan(null);
  };
  
  /**
   * Handle delete scan
   */
  const handleDeleteScan = (scanId: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeScan(scanId);
            setSelectedScan(null);
          },
        },
      ]
    );
  };
  
  /**
   * Handle clear all history
   */
  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all your scan history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: clearAll,
        },
      ]
    );
  };
  
  /**
   * Format date for detail view
   */
  const formatDetailDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="time-outline" size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>No Scans Yet</Text>
      <Text style={styles.emptyText}>
        Your scan history will appear here. Start scanning objects to track your carbon footprint awareness!
      </Text>
    </View>
  );
  
  /**
   * Render header with summary
   */
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Ionicons name="scan-outline" size={24} color={Colors.primary} />
          <Text style={styles.summaryValue}>{summary.totalScans}</Text>
          <Text style={styles.summaryLabel}>Scans</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Ionicons name="cube-outline" size={24} color={Colors.secondary} />
          <Text style={styles.summaryValue}>{summary.totalObjects}</Text>
          <Text style={styles.summaryLabel}>Objects</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Ionicons name="leaf" size={24} color={Colors.carbonMedium} />
          <Text style={styles.summaryValue}>
            {summary.totalCarbonKg >= 1000 
              ? `${(summary.totalCarbonKg / 1000).toFixed(1)}t`
              : `${summary.totalCarbonKg.toFixed(0)}kg`
            }
          </Text>
          <Text style={styles.summaryLabel}>CO₂e Tracked</Text>
        </View>
      </View>
      
      {/* Section header */}
      {history.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {history.length > 5 && (
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearButton}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Screen title */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>History</Text>
      </View>
      
      {/* Main content */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HistoryItem scan={item} onPress={handleScanPress} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />
      
      {/* Detail Modal - Full Screen */}
      <Modal
        visible={selectedScan !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCloseDetail}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <StatusBar barStyle="light-content" />
          
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Scan Details</Text>
              {selectedScan && (
                <Text style={styles.modalSubtitle}>
                  {formatDetailDate(selectedScan.timestamp)}
                </Text>
              )}
            </View>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => selectedScan && handleDeleteScan(selectedScan.id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseDetail}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Results list - full screen scrollable */}
          {selectedScan && (
            <View style={styles.resultsContainer}>
              <ScanResultList
                objects={selectedScan.objects}
                title="Objects Detected"
                showTotal
              />
            </View>
          )}
          
          {/* Back button */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleCloseDetail}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
              <Text style={styles.backButtonText}>Back to History</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  titleBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  title: {
    ...TextStyles.h2,
    color: Colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['2xl'],
    flexGrow: 1,
  },
  
  // Header & Summary
  header: {
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    ...Shadows.small,
  },
  summaryValue: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...TextStyles.h5,
    color: Colors.textSecondary,
  },
  clearButton: {
    ...TextStyles.body,
    color: Colors.error,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['4xl'],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    ...TextStyles.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Modal - Full Screen
  modalFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    ...TextStyles.h3,
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    ...TextStyles.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.carbonHighBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.base,
    width: '100%',
  },
  backButtonText: {
    ...TextStyles.button,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
});

export default HistoryScreen;

