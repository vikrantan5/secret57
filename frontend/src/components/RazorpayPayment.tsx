import React from 'react';
import { WebView } from 'react-native-webview';
import { Modal, StyleSheet, View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../constants/theme';

interface RazorpayPaymentProps {
  visible: boolean;
  orderId: string;
  amount: number;
  onSuccess: (response: any) => void;
  onFailure: (error: any) => void;
  onClose: () => void;
  customerDetails: {
    name: string;
    email: string;
    contact: string;
  };
  description?: string;
}

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_RVeELbQdxuBBiv';

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  visible,
  orderId,
  amount,
  onSuccess,
  onFailure,
  onClose,
  customerDetails,
  description = 'Payment',
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #5B7CFF;
          margin-bottom: 20px;
        }
        .info {
          color: #666;
          margin-bottom: 20px;
        }
        .amount {
          font-size: 32px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
        }
        .btn {
          background: #5B7CFF;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
        }
        .loading {
          color: #666;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🛒 ServiceHub</div>
        <div class="info">${description}</div>
        <div class="amount">₹${amount.toFixed(2)}</div>
        <button class="btn" id="payBtn">Pay Now</button>
        <div class="loading" id="loading" style="display:none;">Opening Payment Gateway...</div>
      </div>
      
      <script>
        document.getElementById('payBtn').addEventListener('click', function() {
          document.getElementById('loading').style.display = 'block';
          openRazorpay();
        });

        function openRazorpay() {
          var options = {
            key: "${RAZORPAY_KEY_ID}",
            amount: ${Math.round(amount * 100)},
            currency: "INR",
            name: "ServiceHub",
            description: "${description}",
            order_id: "${orderId}",
            prefill: {
              name: "${customerDetails.name}",
              email: "${customerDetails.email}",
              contact: "${customerDetails.contact}"
            },
            theme: {
              color: "#5B7CFF"
            },
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                data: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature
                }
              }));
            },
            modal: {
              ondismiss: function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'dismiss'
                }));
              }
            }
          };
          
          var rzp = new Razorpay(options);
          
          rzp.on('payment.failed', function (response){
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'failure',
              data: {
                error: response.error.description,
                code: response.error.code,
                reason: response.error.reason
              }
            }));
          });
          
          try {
            rzp.open();
          } catch (error) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              data: { error: error.message }
            }));
          }
        }
        
        // Auto-open on page load
        setTimeout(openRazorpay, 500);
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      console.log('Razorpay message received:', data);
      
      if (data.type === 'success') {
        onSuccess(data.data);
      } else if (data.type === 'failure') {
        onFailure({
          error: data.data.error || 'Payment failed',
          description: data.data.error,
          code: data.data.code,
          reason: data.data.reason,
        });
      } else if (data.type === 'dismiss') {
        onClose();
      } else if (data.type === 'error') {
        onFailure({
          error: data.data.error || 'Payment processing error',
          description: data.data.error,
        });
      }
    } catch (error) {
      console.error('Error parsing Razorpay message:', error);
      onFailure({ 
        error: 'Payment processing error',
        description: 'Failed to process payment response'
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Payment</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading Payment Gateway...</Text>
            </View>
          )}
          scalesPageToFit
          style={styles.webview}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: spacing.sm,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
