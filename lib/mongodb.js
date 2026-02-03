/**
 * @fileoverview MongoDB Atlas client for storing configuration.
 * Uses connection pooling for serverless environments.
 * 
 * WHY MongoDB Atlas: Free tier, managed service, easy Vercel integration.
 * The Vercel Marketplace provides automatic MONGODB_URI injection.
 */

const { MongoClient } = require('mongodb');

/**
 * MongoDB connection URI from environment.
 * Set via Vercel Marketplace MongoDB Atlas integration.
 * @type {string}
 */
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Database and collection names.
 * Using a single collection for project configs.
 */
const DB_NAME = 'digital-diggaz';
const COLLECTION_NAME = 'configs';

/**
 * Cached MongoDB client for connection reuse.
 * WHY: Serverless functions should reuse connections across invocations
 * to avoid connection pool exhaustion on MongoDB Atlas.
 * @type {MongoClient|null}
 */
let cachedClient = null;

/**
 * Cached database reference.
 * @type {import('mongodb').Db|null}
 */
let cachedDb = null;

/**
 * Connect to MongoDB Atlas and return database reference.
 * Reuses existing connection if available (serverless best practice).
 * 
 * @returns {Promise<import('mongodb').Db>} MongoDB database instance
 * @throws {Error} If MONGODB_URI is not configured
 * 
 * @example
 * const db = await connectToDatabase();
 * const configs = db.collection('configs');
 */
async function connectToDatabase() {
  /**
   * Return cached connection if available.
   * This prevents creating new connections on every function invocation.
   */
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is not set. ' +
      'Add MongoDB Atlas integration via Vercel Marketplace.'
    );
  }

  /**
   * Create new MongoDB client with recommended serverless options.
   * - maxPoolSize: Limit connections (Atlas free tier has 500 limit)
   * - serverSelectionTimeoutMS: Fail fast if Atlas unreachable
   */
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });

  await client.connect();
  
  cachedClient = client;
  cachedDb = client.db(DB_NAME);

  console.log('[MongoDB] Connected to Atlas');
  return cachedDb;
}

/**
 * Get the configs collection.
 * Convenience wrapper for common operation.
 * 
 * @returns {Promise<import('mongodb').Collection>} Configs collection
 */
async function getConfigsCollection() {
  const db = await connectToDatabase();
  return db.collection(COLLECTION_NAME);
}

/**
 * Save or update project configuration.
 * Uses upsert to create if not exists, update if exists.
 * 
 * @param {string} projectId - Unique project identifier (e.g., 'default')
 * @param {Object} vars - Environment variables to store
 * @param {string} vars.FB_TOKEN - Facebook access token
 * @param {string} vars.GROUP_ID - Facebook group ID
 * @param {string} vars.SPOTIFY_CLIENT_ID - Spotify app client ID
 * @param {string} vars.SPOTIFY_CLIENT_SECRET - Spotify app client secret
 * @param {string} vars.SPOTIFY_USER_ID - Spotify user ID
 * @param {string} vars.SPOTIFY_REFRESH_TOKEN - Spotify refresh token
 * @returns {Promise<{ success: boolean, upsertedId?: string }>}
 * 
 * @example
 * await saveConfig('default', {
 *   FB_TOKEN: 'EAABc...',
 *   GROUP_ID: '123456789',
 *   // ... other vars
 * });
 */
async function saveConfig(projectId, vars) {
  const collection = await getConfigsCollection();
  
  /**
   * Upsert pattern: update if projectId exists, insert if not.
   * Also store updatedAt timestamp for auditing.
   */
  const result = await collection.updateOne(
    { projectId },
    {
      $set: {
        projectId,
        vars,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log(`[MongoDB] Config saved for project: ${projectId}`);
  
  return {
    success: true,
    upsertedId: result.upsertedId?.toString(),
    modifiedCount: result.modifiedCount
  };
}

/**
 * Get project configuration by ID.
 * 
 * @param {string} projectId - Project identifier to look up
 * @returns {Promise<Object|null>} Config document or null if not found
 * 
 * @example
 * const config = await getConfig('default');
 * if (config) {
 *   console.log(config.vars.FB_TOKEN);
 * }
 */
async function getConfig(projectId) {
  const collection = await getConfigsCollection();
  return collection.findOne({ projectId });
}

/**
 * List all stored configurations (for admin purposes).
 * Returns only projectId and timestamps, NOT the actual tokens.
 * 
 * @returns {Promise<Array<{ projectId: string, updatedAt: Date }>>}
 */
async function listConfigs() {
  const collection = await getConfigsCollection();
  
  /**
   * Project only safe fields - never expose tokens in list view.
   */
  return collection.find({}, {
    projection: {
      projectId: 1,
      createdAt: 1,
      updatedAt: 1,
      _id: 0
    }
  }).toArray();
}

/**
 * Delete a project configuration.
 * 
 * @param {string} projectId - Project to delete
 * @returns {Promise<{ success: boolean, deletedCount: number }>}
 */
async function deleteConfig(projectId) {
  const collection = await getConfigsCollection();
  const result = await collection.deleteOne({ projectId });
  
  return {
    success: result.deletedCount > 0,
    deletedCount: result.deletedCount
  };
}

/**
 * Get active configuration formatted for use by the application.
 * Loads from MongoDB and returns structured config object for Spotify.
 * 
 * NOTE: Facebook Groups API is deprecated - only Spotify config is used now.
 * 
 * @param {string} [projectId='default'] - Project identifier
 * @returns {Promise<{ spotify: Object }>} Config object
 * @throws {Error} If no configuration is found in database
 * 
 * @example
 * const config = await getActiveConfig();
 * // config.spotify.clientId, config.spotify.clientSecret, etc.
 */
async function getActiveConfig(projectId = 'default') {
  const configDoc = await getConfig(projectId);
  
  if (!configDoc || !configDoc.vars) {
    throw new Error(
      `No configuration found for project "${projectId}". ` +
      'Save configuration via the admin panel at /admin first.'
    );
  }
  
  const vars = configDoc.vars;
  
  /**
   * Validate required Spotify fields exist (Facebook deprecated)
   */
  const requiredFields = [
    'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET',
    'SPOTIFY_USER_ID', 'SPOTIFY_REFRESH_TOKEN'
  ];
  
  const missing = requiredFields.filter(field => !vars[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required config fields: ${missing.join(', ')}`);
  }
  
  return {
    spotify: {
      clientId: vars.SPOTIFY_CLIENT_ID,
      clientSecret: vars.SPOTIFY_CLIENT_SECRET,
      refreshToken: vars.SPOTIFY_REFRESH_TOKEN,
      userId: vars.SPOTIFY_USER_ID
    }
  };
}

module.exports = {
  connectToDatabase,
  getConfigsCollection,
  saveConfig,
  getConfig,
  getActiveConfig,
  listConfigs,
  deleteConfig
};
