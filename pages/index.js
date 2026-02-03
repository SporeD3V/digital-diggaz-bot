/**
 * @fileoverview Main page component
 * Public stats page for Digital Diggaz playlists
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import Hero from '../components/Hero';
import StatsGrid from '../components/StatsGrid';
import TopArtists from '../components/TopArtists';
import NewTracks from '../components/NewTracks';
import VotingSection from '../components/VotingSection';
import OtherPlaylists from '../components/OtherPlaylists';

// Dynamic import for SpotifyEmbed (client-side only - uses browser APIs)
const SpotifyEmbed = dynamic(() => import('../components/SpotifyEmbed'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-zinc-800 rounded-xl animate-pulse" />,
});

/**
 * Home page - displays all playlist stats
 */
export default function Home() {
  // State for stats data
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // State for data extracted from Spotify embed
  const [extractedData, setExtractedData] = useState([]);

  // Callback when track data is extracted from embed
  const handleTrackData = useCallback((track, allTracks) => {
    setExtractedData(allTracks);
    console.log('[Extracted]', track);
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  /**
   * Fetch stats from API
   */
  async function fetchStats() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/stats');
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load stats');
      }

      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());

    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle refresh button click
   */
  function handleRefresh() {
    fetchStats();
  }

  return (
    <>
      {/* Page metadata */}
      <Head>
        <title>Digital Diggaz Playlist Tracker</title>
        <meta name="description" content="Stats and insights for Digital Diggaz community playlists" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Main content */}
      <main className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Loading state */}
          {loading && !stats && (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
              <div className="spinner mb-4"></div>
              <p className="text-spotify-lightgray">Loading playlist data...</p>
            </div>
          )}

          {/* Error state */}
          {error && !stats && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn-secondary">
                Try Again
              </button>
            </div>
          )}

          {/* Main content when loaded */}
          {stats && (
            <>
              {/* Spotify Embed with IFrame API - extracts data as you play */}
              {stats.main?.id && (
                <div className="mb-6">
                  <SpotifyEmbed 
                    playlistId={stats.main.id}
                    onTrackData={handleTrackData}
                  />
                </div>
              )}

              {/* Data source notice */}
              {stats.isHardcodedData && (
                <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4 mb-6 text-center">
                  <p className="text-blue-400 font-medium">
                    📊 Stats from manual data
                  </p>
                  <p className="text-blue-400/70 text-sm mt-1">
                    Track data is manually maintained. Use the embed above for live playlist.
                  </p>
                </div>
              )}

              {/* Hero section with cover and follow CTA */}
              <Hero main={stats.main} />

              {/* Stats comparison grid */}
              <div className="mb-6">
                <StatsGrid total={stats.total} current={stats.current} />
              </div>

              {/* Two column layout for artists and tracks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <TopArtists artists={stats.topArtists} />
                <NewTracks tracks={stats.newTracks} />
              </div>

              {/* Voting section */}
              <div className="mb-6">
                <VotingSection tracks={stats.newTracks} />
              </div>

              {/* Other playlists */}
              <div className="mb-6">
                <OtherPlaylists playlists={stats.otherPlaylists} />
              </div>

              {/* Refresh button and timestamp */}
              <div className="text-center py-6 border-t border-zinc-800">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn-secondary mb-2 disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : '🔄 Refresh Stats'}
                </button>
                
                {lastRefresh && (
                  <p className="text-spotify-gray text-xs">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
