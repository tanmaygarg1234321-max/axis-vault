/**
 * Supabase REST API helper for Node.js
 * Replaces edge function Supabase calls with direct REST API calls
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Make a query to Supabase REST API
 * @param {string} endpoint - The REST endpoint (e.g., "/rest/v1/orders")
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
async function query(endpoint, options = {}) {
  const url = `${supabaseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok && options.method !== "DELETE") {
    const text = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${text}`);
  }

  // For DELETE or minimal returns, just return success
  if (options.headers?.Prefer === "return=minimal" || options.method === "DELETE") {
    return { success: true };
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Fetch data from a table
 * @param {string} table - Table name
 * @param {string} queryString - Query string (e.g., "?select=*&id=eq.123")
 * @returns {Promise<any[]>}
 */
async function select(table, queryString = "?select=*") {
  return query(`/rest/v1/${table}${queryString}`);
}

/**
 * Insert data into a table
 * @param {string} table - Table name
 * @param {object} data - Data to insert
 * @param {boolean} returnMinimal - Whether to return minimal response
 * @returns {Promise<any>}
 */
async function insert(table, data, returnMinimal = true) {
  return query(`/rest/v1/${table}`, {
    method: "POST",
    headers: returnMinimal ? { "Prefer": "return=minimal" } : {},
    body: JSON.stringify(data),
  });
}

/**
 * Update data in a table
 * @param {string} table - Table name
 * @param {string} filter - Filter string (e.g., "?id=eq.123")
 * @param {object} data - Data to update
 * @returns {Promise<any>}
 */
async function update(table, filter, data) {
  return query(`/rest/v1/${table}${filter}`, {
    method: "PATCH",
    headers: { "Prefer": "return=minimal" },
    body: JSON.stringify(data),
  });
}

/**
 * Delete data from a table
 * @param {string} table - Table name
 * @param {string} filter - Filter string (e.g., "?id=eq.123")
 * @returns {Promise<any>}
 */
async function remove(table, filter) {
  return query(`/rest/v1/${table}${filter}`, {
    method: "DELETE",
  });
}

/**
 * Call an RPC function
 * @param {string} functionName - Function name
 * @param {object} params - Function parameters
 * @returns {Promise<any>}
 */
async function rpc(functionName, params = {}) {
  return query(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Log an event to the logs table
 * @param {string} type - Log type (info, error, admin, etc.)
 * @param {string} message - Log message
 * @param {object} metadata - Additional metadata
 * @param {string} orderId - Optional order ID
 */
async function log(type, message, metadata = {}, orderId = null) {
  try {
    await insert("logs", {
      type,
      message,
      metadata,
      order_id: orderId,
    });
  } catch (err) {
    console.error("Failed to log:", err);
  }
}

module.exports = {
  query,
  select,
  insert,
  update,
  remove,
  rpc,
  log,
  get supabaseUrl() { return supabaseUrl; },
  get supabaseKey() { return supabaseKey; },
};
