import React from 'react';
import { WebView } from 'react-native-webview';
import { Modal, StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { colors } from '../constants/theme';

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
}

const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;

export const RazorpayPayment: React.FC<RazorpayPaymentProps> = ({
  visible,
  orderId,
  amount,
  onSuccess,
  onFailure,
  onClose,
  customerDetails,
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
        }
        .loading {
          text-align: center;
          padding: 40px;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #5B7CFF;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="loading">
        <div class="spinner"></div>
        <p>Opening Razorpay Checkout...</p>
      </div>
      <script>
        var options = {
          key: "${RAZORPAY_KEY_ID}",
          amount: ${Math.round(amount * 100)},
          currency: "INR",
          name: "Hybrid Bazaar",
          description: "Order Payment",
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
              data: response
            }));
          },
          modal: {
            ondismiss: function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'close'
              }));
            }
          }
        };
        
        var rzp = new Razorpay(options);
        
        rzp.on('payment.failed', function (response){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'failure',
            data: response
          }));
        });
        
        // Auto-open Razorpay
        setTimeout(function() {
          rzp.open();
        }, 500);
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'success') {
        onSuccess(data.data);
      } else if (data.type === 'failure') {
        onFailure(data.data);
      } else if (data.type === 'close') {
        onClose();
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          scalesPageToFit
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading Payment Gateway...</Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
});
