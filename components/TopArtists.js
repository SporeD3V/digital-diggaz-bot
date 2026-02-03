/**
 * @fileoverview Top artists component
 * Displays ranked list of artists by track count
 */

/**
 * Top artists list
 * Shows top 10 artists with their track counts
 * 
 * @param {Object} props
 * @param {Array} props.artists - Array of { name, count } objects
 */
export default function TopArtists({ artists = [] }) {
  // Don't render if no artists
  if (!artists || artists.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Top Artists</h2>
      
      {/* Artists list */}
      <ol className="space-y-2">
        {artists.map((artist, index) => (
          <li
            key={artist.name}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {/* Rank number */}
            <span className="text-spotify-lightgray font-mono w-6 text-right">
              {index + 1}.
            </span>
            
            {/* Artist name */}
            <span className="flex-1 text-white truncate">
              {artist.name}
            </span>
            
            {/* Track count badge */}
            <span className="bg-spotify-green text-black text-sm font-bold px-2 py-0.5 rounded">
              {artist.count}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
