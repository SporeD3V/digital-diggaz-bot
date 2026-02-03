/**
 * @fileoverview Spotify Embed with IFrame API integration
 * Extracts track data from the embed player as users interact with it
 * 
 * Uses Spotify IFrame API: https://developer.spotify.com/documentation/embeds
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Spotify Embed component with data extraction
 * 
 * @param {Object} props
 * @param {string} props.playlistId - Spotify playlist ID
 * @param {Function} props.onTrackData - Callback when track data is extracted
 * @param {Function} props.onPlaylistData - Callback when playlist data is extracted
 */
export default function SpotifyEmbed({ playlistId, onTrackData, onPlaylistData }) {
  const embedRef = useRef(null);
  const controllerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [extractedTracks, setExtractedTracks] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);

  // Initialize Spotify IFrame API
  useEffect(() => {
    // Load Spotify IFrame API script
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);

    // Define callback when API is ready
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      const element = embedRef.current;
      if (!element) return;

      const options = {
        uri: `spotify:playlist:${playlistId}`,
        width: '100%',
        height: 352,
      };

      // Create the embed controller
      IFrameAPI.createController(element, options, (EmbedController) => {
        controllerRef.current = EmbedController;
        setIsReady(true);

        // Listen for playback updates - this gives us track info!
        EmbedController.addListener('playback_update', (e) => {
          if (e.data && e.data.isPaused === false) {
            // Extract track data from playback event
            const trackData = extractTrackFromEvent(e.data);
            if (trackData) {
              setCurrentTrack(trackData);
              addExtractedTrack(trackData);
            }
          }
        });

        // Listen for ready event
        EmbedController.addListener('ready', () => {
          console.log('[SpotifyEmbed] Player ready');
        });
      });
    };

    return () => {
      // Cleanup
      if (controllerRef.current) {
        controllerRef.current.destroy?.();
      }
      delete window.onSpotifyIframeApiReady;
    };
  }, [playlistId]);

  /**
   * Extract track info from playback event data
   */
  const extractTrackFromEvent = useCallback((data) => {
    if (!data) return null;

    return {
      // Position and duration
      position: data.position || 0,
      duration: data.duration || 0,
      isPaused: data.isPaused,
      isBuffering: data.isBuffering,
      
      // These may be available depending on API version
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Add track to extracted list (dedupe by some identifier)
   */
  const addExtractedTrack = useCallback((track) => {
    setExtractedTracks(prev => {
      // Simple dedupe - just keep last 50 entries
      const updated = [...prev, track].slice(-50);
      
      // Notify parent
      if (onTrackData) {
        onTrackData(track, updated);
      }
      
      return updated;
    });
  }, [onTrackData]);

  /**
   * Try to get more data by playing/pausing
   */
  const togglePlayback = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.togglePlay();
    }
  }, []);

  /**
   * Skip to next track to extract more data
   */
  const nextTrack = useCallback(() => {
    if (controllerRef.current) {
      // IFrame API doesn't have direct next/prev, but we can seek
      // The user needs to manually navigate in the embed
    }
  }, []);

  return (
    <div className="spotify-embed-container">
      {/* Container for Spotify IFrame API to inject into */}
      <div 
        ref={embedRef} 
        className="rounded-xl overflow-hidden"
      />

      {/* Data extraction status */}
      <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white">
            📊 Data Extraction
          </h3>
          <span className={`text-xs px-2 py-1 rounded ${isReady ? 'bg-green-600' : 'bg-yellow-600'}`}>
            {isReady ? 'Ready' : 'Loading...'}
          </span>
        </div>

        {/* Current track info */}
        {currentTrack && (
          <div className="text-xs text-spotify-lightgray mb-2">
            <p>Duration: {Math.round(currentTrack.duration / 1000)}s</p>
            <p>Position: {Math.round(currentTrack.position / 1000)}s</p>
            <p>Playing: {currentTrack.isPaused ? 'No' : 'Yes'}</p>
          </div>
        )}

        {/* Extraction count */}
        <p className="text-xs text-spotify-gray">
          Play tracks in the embed to extract data. 
          Extracted: {extractedTracks.length} events
        </p>

        {/* Hint for user */}
        <p className="text-xs text-blue-400 mt-2">
          💡 Click play on different tracks in the embed above to capture their data.
        </p>
      </div>
    </div>
  );
}
