/**
 * @fileoverview Stats grid component
 * Displays total vs current playlist statistics
 */

import { formatDuration, formatNumber } from '../utils/formatters';

/**
 * Single stat box component
 * 
 * @param {Object} props
 * @param {string} props.label - Stat label
 * @param {string} props.value - Stat value
 * @param {string} props.subtext - Optional subtext
 */
function StatBox({ label, value, subtext }) {
  return (
    <div className="stat-box">
      <p className="text-spotify-lightgray text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subtext && (
        <p className="text-spotify-gray text-xs mt-1">{subtext}</p>
      )}
    </div>
  );
}

/**
 * Stats grid showing total vs current comparison
 * 
 * @param {Object} props
 * @param {Object} props.total - Total stats (all unique tracks)
 * @param {Object} props.current - Current stats (main playlist only)
 */
export default function StatsGrid({ total, current }) {
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">Playlist Stats</h2>
      
      {/* Grid layout: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total tracks (all unique) */}
        <StatBox
          label="Total Tracks"
          value={formatNumber(total?.tracks || 0)}
          subtext="All time unique"
        />
        
        {/* Total listening time */}
        <StatBox
          label="Total Time"
          value={formatDuration(total?.durationMs || 0)}
          subtext="All playlists"
        />
        
        {/* Current tracks (main playlist) */}
        <StatBox
          label="Current Tracks"
          value={formatNumber(current?.tracks || 0)}
          subtext="This month"
        />
        
        {/* Current listening time */}
        <StatBox
          label="Current Time"
          value={formatDuration(current?.durationMs || 0)}
          subtext="Main playlist"
        />
      </div>
    </div>
  );
}
