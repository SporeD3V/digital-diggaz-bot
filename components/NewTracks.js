/**
 * @fileoverview New tracks component
 * Displays recently added tracks to main playlist
 */

import { formatDate } from '../utils/formatters';

/**
 * New tracks list
 * Shows tracks added this month (not in historical playlists)
 * 
 * @param {Object} props
 * @param {Array} props.tracks - Array of track objects
 */
export default function NewTracks({ tracks = [] }) {
  // Don't render if no new tracks
  if (!tracks || tracks.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">New This Month</h2>
        <p className="text-spotify-lightgray">No new tracks yet</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">New This Month</h2>
      
      {/* Tracks list */}
      <ul className="space-y-1">
        {tracks.map((track) => (
          <li key={track.id} className="track-item">
            {/* Track info */}
            <div className="flex-1 min-w-0">
              {/* Track name */}
              <p className="text-white font-medium truncate">
                {track.name}
              </p>
              
              {/* Artists */}
              <p className="text-spotify-lightgray text-sm truncate">
                {track.artists?.join(', ') || 'Unknown Artist'}
              </p>
            </div>
            
            {/* Added date */}
            <span className="text-spotify-gray text-sm whitespace-nowrap">
              {formatDate(track.addedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
