import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { colors, spacing, borderRadius } from '../../constants/theme';
import { extractYouTubeVideoId } from '../../utils/youtubeHelper';

interface YouTubePlayerProps {
  videoUrl: string;
  height?: number;
  autoPlay?: boolean;
}

export const YouTubePlayerComponent: React.FC<YouTubePlayerProps> = ({
  videoUrl,
  height = 250,
  autoPlay = false,
}) => {
  const [playing, setPlaying] = useState(autoPlay);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoId = extractYouTubeVideoId(videoUrl);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setPlaying(false);
    }
    if (state === 'playing') {
      setLoading(false);
    }
  }, []);

  const onReady = useCallback(() => {
    setLoading(false);
  }, []);

  const onError = useCallback((e: string) => {
    setError('Failed to load video');
    setLoading(false);
    console.error('YouTube player error:', e);
  }, []);

  if (!videoId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid YouTube URL</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <YoutubePlayer
          height={height}
          play={playing}
          videoId={videoId}
          onChangeState={onStateChange}
          onReady={onReady}
          onError={onError}
          webViewStyle={styles.webView}
          webViewProps={{
            androidLayerType: 'hardware',
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  webView: {
    borderRadius: borderRadius.lg,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    minHeight: 200,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
  },
});
