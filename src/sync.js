/* exported loadFromKinto */
/* exported saveToKinto */
/* exported BrowserStorageCredentials */

let syncDebounce = null;


const cryptographer = new Jose.WebCryptographer();
cryptographer.setKeyEncryptionAlgorithm('A256KW');
cryptographer.setContentEncryptionAlgorithm('A256GCM');

function shared_key(key) {
  return crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, k: key.k.replace(/=/, '') },
    'AES-KW',
    true,
    ['wrapKey', 'unwrapKey']
  );
}

function encrypt(key, content) {
  const encrypter = new JoseJWE.Encrypter(cryptographer, shared_key(key));
  return encrypter.encrypt(JSON.stringify(content));
}

function decrypt(key, encrypted) {
  const decrypter = new JoseJWE.Decrypter(cryptographer, shared_key(key));
  return decrypter.decrypt(encrypted).then(result => {
    return JSON.parse(result);
  });
}

// An "id schema" used to validate Kinto IDs and generate new ones.
const notesIdSchema = {
  // FIXME: Maybe this should generate IDs?
  generate() {
    throw new Error('cannot generate IDs');
  },

  validate() {
    // FIXME: verify that at least this matches Kinto server ID format
    return true;
  },
};

class ServerKeyNewerError extends Error {
  constructor() {
    super('key used to encrypt the record appears to be newer than our key');
  }
}

class ServerKeyOlderError extends Error {
  constructor() {
    super('key used to encrypt the record appears to be older than our key');
  }
}

class JWETransformer {
  constructor(key) {
    this.key = key;
  }

  async encode(record) {
    // FIXME: should we try to obfuscate the record ID?
    const ciphertext = await encrypt(this.key, record);
    // Copy over the _status field, so that we handle concurrency
    // headers (If-Match, If-None-Match) correctly.
    // DON'T copy over "deleted" status, because then we'd leak
    // plaintext deletes.
    const status = record._status && (record._status === 'deleted' ? 'updated' : record._status);
    const encryptedResult = {
      content: ciphertext,
      id: record.id,
      _status: status,
      kid: this.key.kid,
    };
    if (record.hasOwnProperty('last_modified')) {
      encryptedResult.last_modified = record.last_modified;
    }

    return encryptedResult;
  }

  async decode(record) {
    if (!record.content) {
      // This can happen for tombstones if a record is deleted.
      if (record.deleted) {
        return record;
      }
      throw new Error('No ciphertext: nothing to decrypt?');
    }

    if (record.kid.substr(15) !== this.key.kid.substr(15)) {
      if (this.key.kid < record.kid) {
        throw new ServerKeyNewerError();
      } else {
        throw new ServerKeyOlderError();
      }
    }

    // FIXME: Make sure this is backwards compatible??
    let decoded = await decrypt(this.key, record.content);
    if (!decoded.hasOwnProperty('id')) {
      // Old-style encrypted notes aren't true Kinto records --
      // they're just the content field.
      decoded = {
        content: decoded,
        id: 'singleNote',
      };
    }
    if (record.hasOwnProperty('last_modified')) {
      decoded.last_modified = record.last_modified;
    }

    // _status: deleted records were deleted on a client, but
    // uploaded as an encrypted blob so we don't leak deletions.
    // If we get such a record, flag it as deleted.
    if (decoded._status === 'deleted') {
      decoded.deleted = true;
    }
    return decoded;
  }
}

/**
 * Interface describing a mechanism to fetch credentials.
 */
class Credentials {
  async get() {
    return Promise.reject('Implement me');
  }

  /**
   * Call this if, for example, credentials were invalid.
   */
  async clear() {
    return Promise.reject('Implement me');
  }
}

class BrowserStorageCredentials extends Credentials {
  constructor(storage) {
    super();
    this.storage = storage;
  }

  async get() {
    const data = await this.storage.get(['credentials']);
    return data.credentials;
  }

  async clear() {
    return this.storage.remove('credentials');
  }
}

/**
 * Try to sync our data against the Kinto server.
 *
 * Returns a promise. The promise can reject in case of sync failure
 * or any other reason. This is so that programming errors can be
 * caught more easily in testing. Since this application is
 * offline-first, sync failure should not be a failure for callers.
 */
function syncKinto(client, credentials) {
  // Get credentials and lastmodified
  let credential;
  return credentials.get()
    .then(received => {
      credential = received;
      // XXX: Ask for an refresh token
      // Query Kinto with the Bearer Token
      if (!received) return;
      return client
        .collection('notes', {
          idSchema: notesIdSchema,
          remoteTransformers: [new JWETransformer(credential.key)],
        })
        .sync({
          headers: { Authorization: `Bearer ${credential.access_token}` },
          // FIXME: Handle conflicts
          strategy: 'server_wins',
        });
    })
    .then(syncResult => {
      // FIXME: conflicts would happen here.
      // Do we need to do anything with errors, published, updated, etc.?
      return syncResult;
    })
    .catch(error => {
      if (error.response && error.response.status === 401) {
        // In case of 401 log the user out.
        // FIXME: Fetch a new token and retry?
        return credentials.clear();
      } else if (error instanceof ServerKeyNewerError) {
        // If the key date is greater than current one, log the user out.
        console.error(error);
        return credentials.clear();
      } else if (error instanceof ServerKeyOlderError) {
        // If the key date is older than the current one, we can't help
        // because there is no way we get the previous key.
        // Flush the server because whatever was there is wrong.
        // FIXME: need to reset sync status.
        console.error(error);
        const kintoHttp = client.api.remote;
        return kintoHttp.bucket('default').deleteCollection('notes', {
          headers: { Authorization: `Bearer ${credential.access_token}` }
        });
      } else {
        console.error(error);
        return Promise.reject(error);
      }
    });
}

/**
 * Try to sync against the Kinto server, and retrieve the current note
 * contents.
 *
 * On completion, a 'kinto-loaded' event will be fired with the
 * following structure:
 *
 * {
 *   action: 'kinto-loaded',
 *   data: the "content" that was previously saved to Kinto, or null
 *     if nothing was previously saved to Kinto (for example, a new
 *     FxA account, or if syncing failed on a fresh profile)
 *   last_modified: the timestamp of the sync, or null
 * }
 */
function loadFromKinto(client, credentials) {
  function retrieveNote() {
    return client.collection('notes', {
      idSchema: notesIdSchema,
    }).getAny('singleNote');
  }

  return syncKinto(client, credentials)
  // Ignore failure of syncKinto by retrieving note even when promise rejected
    .then(retrieveNote, retrieveNote)
    .then(result => {
      console.log('Collection had record', result);
      browser.runtime.sendMessage({
        action: 'kinto-loaded',
        data: result ? result.data.content : null,
        last_modified: result ? result.data.last_modified : null,
      });
    });
}

function saveToKinto(client, credentials, content) {
  // XXX: Debounce the call and set the status to Editing
  browser.runtime.sendMessage('notes@mozilla.com', {
    action: 'text-editing'
  });

  const later = function() {
    syncDebounce = null;
    const notes = client.collection('notes', {
      idSchema: notesIdSchema,
    });
    return notes.upsert({ id: 'singleNote', content })
      .then(() => {
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-saved'
        });
        return syncKinto(client, credentials);
      })
      .then(() => {
        // FIXME: Do anything with sync result?
        return notes.getAny('singleNote');
      })
      .then(result => {
        // Set the status to synced
        browser.runtime.sendMessage('notes@mozilla.com', {
          action: 'text-synced',
          last_modified: result.data.last_modified,
        });
      });
  };

  clearTimeout(syncDebounce);
  syncDebounce = setTimeout(later, 1000);
}
