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
      <meta charset="UTF-8">
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
          max-width: 400px;
          width: 100%;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4F7C82;
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
          background: #4F7C82;
          color: white;
          border: none;
          padding: 15px 30px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
          width: 100%;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .loading {
          color: #666;
          margin-top: 20px;
          font-size: 14px;
        }
        .error {
          color: #F87171;
          margin-top: 20px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🛒 ServiceHub</div>
        <div class="info">${description}</div>
        <div class="amount">₹${amount.toFixed(2)}</div>
        <button class="btn" id="payBtn">Pay Now</button>
        <div class="loading" id="loading" style="display:none;">Loading payment gateway...</div>
        <div class="error" id="error" style="display:none;"></div>
      </div>
      
      <script>
        // Global error handler
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          console.error('Global error:', msg, error);
          showError('Failed to load payment gateway. Please try again.');
          return false;
        };

        function showError(message) {
          var errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
          document.getElementById('loading').style.display = 'none';
          document.getElementById('payBtn').disabled = false;
        }

        function showLoading(message) {
          var loadingDiv = document.getElementById('loading');
          loadingDiv.textContent = message;
          loadingDiv.style.display = 'block';
          document.getElementById('error').style.display = 'none';
          document.getElementById('payBtn').disabled = true;
        }

        // Load Razorpay script dynamically
        function loadRazorpayScript() {
          return new Promise(function(resolve, reject) {
            if (typeof Razorpay !== 'undefined') {
              console.log('Razorpay already loaded');
              resolve();
              return;
            }

            var script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = function() {
              console.log('Razorpay script loaded successfully');
              resolve();
            };
            script.onerror = function() {
              console.error('Failed to load Razorpay script');
              reject(new Error('Failed to load Razorpay library'));
            };
            document.head.appendChild(script);
          });
        }

        function openRazorpay() {
          showLoading('Opening payment gateway...');
          
          loadRazorpayScript()
            .then(function() {
              console.log('Initializing Razorpay with:', {
                key: "${RAZORPAY_KEY_ID}",
                amount: ${Math.round(amount * 100)},
                currency: "INR",
                orderId: "${orderId}"
              });

              if (typeof Razorpay === 'undefined') {
                throw new Error('Razorpay library not loaded');
              }

              var options = {
                key: "${RAZORPAY_KEY_ID}",
                amount: ${Math.round(amount * 100)},
                currency: "INR",
                name: "ServiceHub",
                description: "${description.replace(/"/g, '"')}",
                order_id: "${orderId}",
                prefill: {
                  name: "${customerDetails.name.replace(/"/g, '"')}",
                  email: "${customerDetails.email}",
                  contact: "${customerDetails.contact}"
                },
                theme: {
                  color: "#4F7C82"
                },
                handler: function (response) {
                  console.log('Payment success:', response);
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
                    console.log('Payment dismissed');
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('payBtn').disabled = false;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'dismiss'
                    }));
                  }
                }
              };
              
              var rzp = new Razorpay(options);
              
              rzp.on('payment.failed', function (response) {
                console.error('Payment failed:', response);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'failure',
                  data: {
                    error: response.error.description || 'Payment failed',
                    code: response.error.code,
                    reason: response.error.reason
                  }
                }));
              });
              
              console.log('Opening Razorpay checkout...');
              rzp.open();
              document.getElementById('loading').style.display = 'none';
            })
            .catch(function(error) {
              console.error('Razorpay initialization error:', error);
              showError(error.message || 'Failed to initialize payment gateway');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                data: { error: error.message || 'Failed to load payment gateway' }
              }));
            });
        }

        // Button click handler
        document.getElementById('payBtn').addEventListener('click', function() {
          openRazorpay();
        });

        // Auto-open after a short delay
        setTimeout(function() {
          openRazorpay();
        }, 500);
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      console.log('Raw Razorpay message:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      
      console.log('Parsed Razorpay message:', data);
      
      if (data.type === 'success') {
        console.log('Payment successful - data:', data.data);
        onSuccess(data.data);
      } else if (data.type === 'failure') {
        console.error('Payment failed - data:', data.data);
        onFailure({
          error: data.data.error || 'Payment failed',
          description: data.data.error || 'Payment could not be processed',
          code: data.data.code,
          reason: data.data.reason,
        });
      } else if (data.type === 'dismiss') {
        console.log('Payment modal dismissed by user');
        onClose();
      } else if (data.type === 'error') {
        console.error('Payment error - data:', data.data);
        onFailure({
          error: data.data.error || 'Payment processing error',
          description: data.data.error || 'An error occurred while processing payment',
        });
      } else {
        console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing Razorpay message:', error, 'Raw data:', event.nativeEvent.data);
      onFailure({ 
        error: 'Payment processing error',
        description: 'Failed to process payment response. Please try again.'
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
