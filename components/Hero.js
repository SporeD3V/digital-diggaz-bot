/**
 * @fileoverview Hero section component
 * Displays main playlist cover, name, and follow CTA
 */

import Image from 'next/image';
import { formatNumber } from '../utils/formatters';

/**
 * Hero section with playlist cover and follow button
 * 
 * @param {Object} props
 * @param {Object} props.main - Main playlist metadata
 */
export default function Hero({ main }) {
  // Fallback values
  const name = main?.name || 'Digital Diggaz';
  const coverImage = main?.coverImage;
  const followers = main?.followers || 0;
  const url = main?.url || '#';

  return (
    <div className="text-center mb-8">
      {/* Playlist cover image */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 mx-auto mb-6 rounded-lg overflow-hidden shadow-2xl">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          // Fallback gradient if no cover
          <div className="w-full h-full bg-gradient-to-br from-spotify-green to-green-700 flex items-center justify-center">
            <span className="text-6xl">🎵</span>
          </div>
        )}
      </div>

      {/* Playlist name */}
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
        {name}
      </h1>

      {/* Follower count */}
      <p className="text-spotify-lightgray mb-4">
        {formatNumber(followers)} followers
      </p>

      {/* Follow CTA button */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-spotify inline-flex items-center gap-2"
      >
        {/* Spotify icon */}
        <svg 
          className="w-5 h-5" 
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Follow on Spotify
      </a>
    </div>
  );
}
