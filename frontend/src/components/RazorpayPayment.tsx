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
  console.log('RazorpayPayment initialized with:', {
    keyId: RAZORPAY_KEY_ID,
    orderId,
    amount,
    customerDetails,
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src *; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';">
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
          padding: 10px;
          background: #FEE2E2;
          border-radius: 6px;
        }
               .debug {
          margin-top: 20px;
          font-size: 11px;
          color: #666;
          text-align: left;
          background: #f5f5f5;
          padding: 10px;
          border-radius: 6px;
          max-height: 200px;
          overflow-y: auto;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🛒 ServiceHub</div>
        <div class="info">${description}</div>
        <div class="amount">₹${amount.toFixed(2)}</div>
               <!-- Test Mode Info -->
        <div style="background: #10B981; padding: 16px; border-radius: 8px; margin: 15px 0; font-size: 14px; color: white; text-align: left;">
          <strong style="font-size: 16px;">🎯 RAZORPAY TEST MODE - HOW TO TEST:</strong><br>
          <div style="margin-top: 12px; background: rgba(255,255,255,0.25); padding: 14px; border-radius: 6px; line-height: 1.9;">
            <strong style="font-size: 15px;">✅ METHOD 1: Using Test Card (Recommended)</strong><br>
            <strong>1.</strong> Click on <strong>"Cards"</strong> option<br>
            <strong>2.</strong> Enter: <span style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">4111 1111 1111 1111</span><br>
            <strong>3.</strong> CVV: <span style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">123</span> | Expiry: <span style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px; font-family: monospace;">12/30</span><br>
            <strong>4.</strong> Click <strong>"Pay"</strong> button<br>
            <strong>5.</strong> On next page, click <strong>"Success"</strong> button<br>
          </div>
          <div style="margin-top: 10px; font-size: 12px; background: rgba(255,255,255,0.15); padding: 10px; border-radius: 6px;">
            💡 <strong>Note:</strong> If card doesn't work, try:<br>
            • Card: 5555 5555 5555 4444 (Mastercard)<br>
            • Or any other payment method available
          </div>
        </div>
        
        <button class="btn" id="payBtn">Pay Now</button>
        <div class="loading" id="loading" style="display:none;">Loading payment gateway...</div>
        <div class="error" id="error" style="display:none;"></div>
        <div class="debug" id="debug"></div>
      </div>
      
      <script>
        // Debug logger
        function logDebug(message) {
          var timestamp = new Date().toLocaleTimeString();
          console.log('[Razorpay ' + timestamp + ']', message);
          var debugDiv = document.getElementById('debug');
          debugDiv.innerHTML += '[' + timestamp + '] ' + message + '<br>';
          debugDiv.scrollTop = debugDiv.scrollHeight;
        }

        // Global error handler
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          logDebug('Global error: ' + msg);
          showError('Failed to load payment gateway. Please check your internet connection.');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            data: { error: 'Script loading failed: ' + msg }
          }));
          return false;
        };

        function showError(message) {
          logDebug('Error: ' + message);
          var errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
          document.getElementById('loading').style.display = 'none';
          document.getElementById('payBtn').disabled = false;
        }

        function showLoading(message) {
          logDebug('Loading: ' + message);
          var loadingDiv = document.getElementById('loading');
          loadingDiv.textContent = message;
          loadingDiv.style.display = 'block';
          document.getElementById('error').style.display = 'none';
          document.getElementById('payBtn').disabled = true;
        }

        // Load Razorpay script dynamically
        function loadRazorpayScript() {
          return new Promise(function(resolve, reject) {
            // Check if Razorpay is already loaded
            if (typeof Razorpay !== 'undefined') {
              logDebug('Razorpay already loaded from head script');
              resolve();
              return;
            }

            // Wait a bit for the head script to load
            logDebug('Waiting for Razorpay to load from head...');
            var attempts = 0;
            var checkInterval = setInterval(function() {
              attempts++;
              if (typeof Razorpay !== 'undefined') {
                logDebug('Razorpay loaded after ' + attempts + ' attempts');
                clearInterval(checkInterval);
                resolve();
              } else if (attempts > 20) {
                logDebug('Razorpay failed to load after 20 attempts, trying dynamic load...');
                clearInterval(checkInterval);
                
                // Fallback: try to load dynamically
                var script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = function() {
                  logDebug('Razorpay script loaded dynamically');
                  resolve();
                };
                script.onerror = function(e) {
                  logDebug('Failed to load Razorpay script: ' + e);
                  reject(new Error('Failed to load Razorpay library. Please check your internet connection.'));
                };
                document.head.appendChild(script);
              }
            }, 100);
          });
        }

        function openRazorpay() {
          showLoading('Connecting to payment gateway...');
          
          loadRazorpayScript()
            .then(function() {
              logDebug('Razorpay script ready, checking if Razorpay is defined...');
              
              if (typeof Razorpay === 'undefined') {
                throw new Error('Razorpay is still undefined after loading');
              }
              
              logDebug('Razorpay is defined, creating options...');

              var options = {
                key: "${RAZORPAY_KEY_ID}",
                 order_id: "${orderId}",
                amount: ${Math.round(amount * 100)},
                currency: "INR",
                name: "ServiceHub",
                description: "${description.replace(/"/g, '"')}",
                  method: "card",
                allow_retry: true,
                config: {
                  display: {
                    blocks: {
                      card: {
                        name: "Pay with Cards",
                        instruments: [
                          {
                            method: "card"
                          }
                        ]
                      }
                    },
                    sequence: ["block.card"],
                    preferences: {
                      show_default_blocks: true
                    }
                  }
                },
                prefill: {
                  name: "${customerDetails.name.replace(/"/g, '"')}",
                  email: "${customerDetails.email}",
                  contact: "${customerDetails.contact}"
                },
                theme: {
                  color: "#4F7C82"
                },
                handler: function (response) {
                  logDebug('Payment success: ' + JSON.stringify(response));
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'success',
                    data: {
                      razorpay_payment_id: response.razorpay_payment_id,
                       razorpay_order_id: response.razorpay_order_id || "${orderId}",
                      razorpay_signature: response.razorpay_signature || ''
                    }
                  }));
                },
                modal: {
                  ondismiss: function() {
                    logDebug('Payment modal dismissed by user');
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('payBtn').disabled = false;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'dismiss'
                    }));
                  }
                }
              };
              
             logDebug('Creating Razorpay instance with options: ' + JSON.stringify(options));
              var rzp = new Razorpay(options);
              logDebug('Razorpay instance created successfully');
              
              rzp.on('payment.failed', function (response) {
                logDebug('Payment failed: ' + JSON.stringify(response.error));
                var errorMsg = response.error.description || response.error.reason || 'Payment failed';
               // Handle specific error cases
                if (response.error.code === 'BAD_REQUEST_ERROR') {
                  if (response.error.reason === 'card_number_invalid') {
                    errorMsg = '⚠️ Card validation failed. In TEST MODE, try using card: 4111 1111 1111 1111 (CVV: 123, Expiry: 12/30). After entering card details, click "Pay" then click "Success" button on the next page.';
                  } else if (response.error.description && response.error.description.includes('another method')) {
                    errorMsg = '⚠️ This payment method is not available in test mode. Please try the Cards option: Click "Cards" → Enter 4111 1111 1111 1111 → CVV: 123 → Expiry: 12/30 → Click "Pay" → Click "Success" on next page.';
                  }
                }
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'failure',
                  data: {
                    error: errorMsg,
                    code: response.error.code,
                    reason: response.error.reason,
                    description: response.error.description
                  }
                }));
              });
              
             logDebug('Opening Razorpay checkout modal...');
              try {
                rzp.open();
                logDebug('Razorpay checkout modal opened successfully');
              } catch (openError) {
                logDebug('Error opening Razorpay modal: ' + openError);
                throw openError;
              }
              document.getElementById('loading').style.display = 'none';
            })
            .catch(function(error) {
              logDebug('Razorpay initialization error: ' + error.message);
              showError(error.message || 'Failed to initialize payment gateway');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                data: { error: error.message || 'Failed to load payment gateway' }
              }));
            });
        }

        // Button click handler
        var payButton = document.getElementById('payBtn');
        var isProcessing = false;
        
        payButton.addEventListener('click', function(e) {
          e.preventDefault();
          if (isProcessing) {
            logDebug('Payment already in progress, ignoring click');
            return;
          }
          logDebug('Pay Now button clicked');
          isProcessing = true;
          openRazorpay();
        });

        // Auto-open after a short delay
        setTimeout(function() {
          if (!isProcessing) {
            logDebug('Auto-opening payment gateway...');
            isProcessing = true;
            openRazorpay();
          }
        }, 1000);
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      console.log('📨 Raw Razorpay WebView message:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      
      console.log('📦 Parsed Razorpay message type:', data.type);
      console.log('📦 Parsed Razorpay message data:', JSON.stringify(data.data, null, 2));
      
      if (data.type === 'success') {
        console.log('✅ Payment successful!');
        console.log('Payment ID:', data.data.razorpay_payment_id);
        console.log('Order ID:', data.data.razorpay_order_id);
        onSuccess(data.data);
      } else if (data.type === 'failure') {
        console.error('❌ Payment failed');
        console.error('Error code:', data.data.code);
        console.error('Error reason:', data.data.reason);
        console.error('Error description:', data.data.description);
        onFailure({
          error: data.data.error || 'Payment failed',
          description: data.data.description || data.data.error || 'Payment could not be processed',
          code: data.data.code,
          reason: data.data.reason,
        });
      } else if (data.type === 'dismiss') {
        console.log('⚠️ Payment modal dismissed by user');
        onClose();
      } else if (data.type === 'error') {
        console.error('🔴 Payment processing error');
        console.error('Error details:', data.data.error);
        onFailure({
          error: data.data.error || 'Payment processing error',
          description: data.data.error || 'An error occurred while loading the payment gateway. Please check your internet connection and try again.',
        });
      } else {
        console.warn('⚠️ Unknown message type received:', data.type);
      }
    } catch (error) {
      console.error('❌ Error parsing Razorpay WebView message');
      console.error('Parse error:', error);
      console.error('Raw data received:', event.nativeEvent.data);
      onFailure({ 
        error: 'Payment processing error',
        description: 'Failed to process payment response. This might be due to a network issue. Please try again.'
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
