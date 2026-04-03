import React, { useRef, useEffect } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/theme';
import CashfreeService from '../services/cashfreeService';

interface CashfreePaymentProps {
  visible: boolean;
  paymentSessionId: string;
  paymentUrl?: string; // Optional: Direct payment URL from API
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
}

export default function CashfreePayment({
  visible,
  paymentSessionId,
  paymentUrl: providedPaymentUrl,
  onSuccess,
  onFailure,
  onCancel,
}: CashfreePaymentProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = React.useState(true);

  const paymentUrl = CashfreeService.getPaymentSessionUrl(paymentSessionId, providedPaymentUrl);

  const handleWebViewNavigationStateChange = (navState: any) => {
    const { url } = navState;
    console.log('Navigation URL:', url);

    // Check if payment is complete (return URL)
    if (url.includes('subscription-success') || url.includes('payment-success')) {
      // Extract order_id from URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const orderId = urlParams.get('order_id');
      
      if (orderId) {
        // Verify payment
        verifyPayment(orderId);
      }
    }

    // Check for failure
    if (url.includes('payment-failure') || url.includes('payment-cancel')) {
      onFailure('Payment was cancelled or failed');
    }
  };

  const verifyPayment = async (orderId: string) => {
    try {
      const result = await CashfreeService.verifyPayment(orderId);
      
      if (result.success && result.data) {
        const { payment_status, order_id, cf_payment_id } = result.data;
        
        if (payment_status === 'SUCCESS' || payment_status === 'PAID') {
          onSuccess(cf_payment_id || order_id, order_id);
        } else {
          onFailure(`Payment ${payment_status.toLowerCase()}`);
        }
      } else {
        onFailure(result.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      onFailure(error.message || 'Payment verification failed');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={{ uri: paymentUrl }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          style={styles.webView}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            onFailure('Failed to load payment page');
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('HTTP error:', nativeEvent);
            if (nativeEvent.statusCode >= 400) {
              onFailure('Payment gateway error');
            }
          }}
        />

        {/* Info Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.footerText}>Secure payment powered by Cashfree</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
