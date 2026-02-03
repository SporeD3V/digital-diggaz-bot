/**
 * @fileoverview Other playlists component
 * Displays list of historical/archived playlists
 */

import { formatNumber } from '../utils/formatters';

/**
 * Other playlists section
 * Shows historical playlists with links and track counts
 * 
 * @param {Object} props
 * @param {Array} props.playlists - Array of playlist objects
 */
export default function OtherPlaylists({ playlists = [] }) {
  // Don't render if no other playlists
  if (!playlists || playlists.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Past Playlists</h2>
      
      {/* Playlists grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {playlists.map((playlist) => (
          <a
            key={playlist.id}
            href={playlist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg 
                       bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            {/* Playlist name */}
            <span className="text-white truncate pr-2">
              {playlist.name}
            </span>
            
            {/* Track count */}
            <span className="text-spotify-lightgray text-sm whitespace-nowrap">
              {formatNumber(playlist.trackCount)} tracks
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
