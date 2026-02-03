/**
 * @fileoverview Track of the Month voting component
 * Allows users to vote and view current results
 */

import { useState, useEffect } from 'react';

/**
 * Voting section component
 * Displays voting form and current results
 * 
 * @param {Object} props
 * @param {Array} props.tracks - Available tracks to vote for
 */
export default function VotingSection({ tracks = [] }) {
  // State for vote results
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current vote results on mount
  useEffect(() => {
    fetchVotes();
  }, []);

  /**
   * Fetch current vote counts from API
   */
  async function fetchVotes() {
    try {
      const res = await fetch('/api/vote');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Failed to fetch votes:', err);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Submit a vote for a track
   * 
   * @param {Object} track - Track to vote for
   */
  async function handleVote(track) {
    if (voting || voted) return;

    setVoting(true);
    setError(null);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          trackName: track.name,
          artists: track.artists,
        }),
      });

      if (!res.ok) {
        throw new Error('Vote failed');
      }

      // Mark as voted and refresh results
      setVoted(true);
      await fetchVotes();

    } catch (err) {
      setError('Failed to submit vote. Try again.');
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">🗳️ Track of the Month</h2>
      
      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {/* Loading state */}
      {loading ? (
        <p className="text-spotify-lightgray">Loading votes...</p>
      ) : (
        <>
          {/* Current results */}
          {results.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-spotify-lightgray mb-2">
                Current Results
              </h3>
              <ul className="space-y-2">
                {results.slice(0, 5).map((item, index) => (
                  <li 
                    key={item.trackId}
                    className="flex items-center gap-2 text-sm"
                  >
                    {/* Rank medal for top 3 */}
                    <span className="w-6">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                    </span>
                    <span className="flex-1 truncate text-white">
                      {item.trackName}
                    </span>
                    <span className="text-spotify-green font-bold">
                      {item.votes}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vote buttons */}
          {!voted && tracks.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-spotify-lightgray mb-2">
                Cast Your Vote
              </h3>
              <div className="flex flex-wrap gap-2">
                {tracks.slice(0, 5).map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleVote(track)}
                    disabled={voting}
                    className="btn-secondary text-xs disabled:opacity-50"
                  >
                    {track.name.slice(0, 20)}
                    {track.name.length > 20 && '...'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voted confirmation */}
          {voted && (
            <p className="text-spotify-green text-sm">
              ✓ Thanks for voting!
            </p>
          )}
        </>
      )}
    </div>
  );
}
