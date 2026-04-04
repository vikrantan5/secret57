import React, { useRef, useState } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/theme';

interface CashfreePaymentProps {
  visible: boolean;
  paymentSessionId?: string;
  paymentUrl?: string;
  orderId?: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
}

export default function CashfreePayment({
  visible,
  paymentSessionId,
  paymentUrl,
  orderId,
  onSuccess,
  onFailure,
  onCancel,
}: CashfreePaymentProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  // Determine if we should use direct URL or embed Cashfree SDK
  const useDirectUrl = !!paymentUrl && !paymentSessionId;

  const getHtmlContent = () => {
    // Use the raw payment_session_id as-is
    const sessionId = paymentSessionId;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #payment-form { width: 100%; height: 100vh; }
          .loader { text-align: center; padding: 50px; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div id="payment-form">
          <div class="loader">Loading payment gateway...</div>
        </div>
        
        <script>
          // Initialize Cashfree checkout
          const cashfree = new Cashfree({
            mode: "sandbox" // Change to "production" for live
          });
          
          let checkoutOptions = {
            paymentSessionId: "${sessionId}",
            returnUrl: "https://hybrid-bazaar.preview.emergentagent.com/seller/subscription-success",
            redirectTarget: "_self"
          };
          
          cashfree.checkout(checkoutOptions).then(function(result) {
            if(result.error) {
              console.log("Payment error:", result.error);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: result.error.message || 'Payment failed'
              }));
            } else {
              console.log("Payment success:", result);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                paymentId: result.paymentDetails?.paymentId || '',
                orderId: result.paymentDetails?.orderId || '${orderId}'
              }));
            }
          }).catch(function(error) {
            console.log("Checkout error:", error);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: error.message || 'Failed to initialize payment'
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Payment message:', data);
      
      if (data.type === 'success') {
        onSuccess(data.paymentId, data.orderId);
      } else if (data.type === 'error') {
        onFailure(data.message);
      }
    } catch (error) {
      console.error('Message parse error:', error);
    }
  };

   const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    console.log('Navigation URL:', url);
    
    // Handle success redirects
    if (url && (url.includes('subscription-success') || url.includes('payment-success') || url.includes('booking-success'))) {
      // Payment completed via redirect
      onSuccess('', orderId || '');
    }
    
    // Handle Cashfree payment status from URL
    if (url && url.includes('order_status=')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const orderStatus = urlParams.get('order_status');
      const orderIdFromUrl = urlParams.get('order_id') || orderId || '';
      
      if (orderStatus === 'PAID' || orderStatus === 'SUCCESS') {
        onSuccess('', orderIdFromUrl);
      } else if (orderStatus === 'FAILED' || orderStatus === 'CANCELLED') {
        onFailure(orderStatus === 'CANCELLED' ? 'Payment cancelled' : 'Payment failed');
      }
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={useDirectUrl ? { uri: paymentUrl! } : { html: getHtmlContent() }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          style={styles.webView}
          onError={(error) => {
            console.error('WebView error:', error);
            onFailure('Failed to load payment page');
          }}
        />

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