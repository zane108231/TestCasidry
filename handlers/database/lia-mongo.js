const mongoose = require("mongoose");

const os = require("os");
let connectedURI = [];

class CassMongo {
  static schema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  });

  constructor({
    uri,
    collection,
    isOwnHost = false,
    ignoreError = false,
    allowClear = false,
    createConnection = false,
  }) {
    if (isOwnHost) {
      const hostname = os.hostname();
      this.uri = `mongodb://${hostname}:27017/${uri.replace(
        /^mongodb:\/\/[^\/]+\/|\/$/,
        ""
      )}`;
    } else {
      this.uri = uri;
    }
    this.collection = collection;
    this.ignoreError = ignoreError;
    this.allowClear = allowClear;
    this.createConnection = createConnection;

    const keyValueSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
    });

    this.KeyValue = mongoose.model(collection, keyValueSchema);
  }

  async start(ignoreReconnect) {
    try {
      if (connectedURI.includes(this.uri)) {
        if (!ignoreReconnect) {
          throw new Error("Already connected to this database");
        }
        return;
      }

      mongoose.set("strictQuery", true);

      if (this.createConnection) {
        this.connection = mongoose.createConnection(this.uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        /*this.KeyValue = this.connection.model(this.collection, LiaMongo.schema);*/
      } else {
        await mongoose.connect(this.uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        connectedURI.push(this.uri);
        /*this.KeyValue = mongoose.model(this.collection, LiaMongo.schema);*/
      }

      console.log("MongoDB connection established");
    } catch (error) {
      if (this.ignoreError) {
        console.error("MongoDB connection error:", error);
      } else {
        throw error;
      }
    }
  }

  async get(key) {
    try {
      const result = await this.KeyValue.findOne({ key: String(key) });
      return result ? result.value : null;
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting value:", error);
        return null;
      } else {
        throw error;
      }
    }
  }

  async bulkGet(...keys) {
    keys = keys.flat();
    try {
      const results = await this.KeyValue.find({ key: { $in: keys } });
      return results.map((result) => result.value);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting values:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async put(key, value) {
    try {
      await this.KeyValue.findOneAndUpdate(
        { key: String(key) },
        { key: String(key), value },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error putting value:", error);
      } else {
        throw error;
      }
    }
  }

  async bulkPut(pairs) {
    try {
      const mappedPairs = Object.entries(pairs).map(([key, value]) => ({
        updateOne: {
          filter: { key: String(key) },
          update: { key: String(key), value },
          upsert: true,
        },
      }));

      await this.KeyValue.bulkWrite(mappedPairs);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error setting values:", error);
      } else {
        throw error;
      }
    }
  }
  async remove(key) {
    try {
      await this.KeyValue.deleteOne({ key: String(key) });
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error removing value:", error);
      } else {
        throw error;
      }
    }
  }

  async containsKey(key) {
    try {
      const count = await this.KeyValue.countDocuments({ key: String(key) });
      return count > 0;
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error checking key:", error);
        return false;
      } else {
        throw error;
      }
    }
  }

  async size() {
    try {
      return await this.KeyValue.countDocuments({});
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting size:", error);
        return 0;
      } else {
        throw error;
      }
    }
  }

  async keys() {
    try {
      const results = await this.KeyValue.find({}, "key");
      return results.map((doc) => doc.key);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting keys:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async values() {
    try {
      const results = await this.KeyValue.find({}, "value");
      return results.map((doc) => doc.value);
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting values:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async entries() {
    try {
      const results = await this.KeyValue.find({}, "key value");
      return results.map((doc) => ({ key: doc.key, value: doc.value }));
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error getting entries:", error);
        return [];
      } else {
        throw error;
      }
    }
  }

  async preProc(data) {
    return data;
  }

  async load() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return await this.preProc(result);
  }

  async clear() {
    if (!this.allowClear) {
      throw new Error("Clearing the collection is not allowed.");
    }

    try {
      await this.KeyValue.deleteMany({});
    } catch (error) {
      if (this.ignoreError) {
        console.error("Error clearing collection:", error);
      } else {
        throw error;
      }
    }
  }

  async toObject() {
    const entries = await this.entries();
    let result = {};
    for (const { key, value } of entries) {
      Reflect.set(result, key, value);
    }
    return result;
  }

  async toJSON() {
    return await this.toObject();
  }

  async *[Symbol.iterator]() {
    const entries = await this.entries();
    yield* entries;
  }

  async *iKeys() {
    const keys = await this.keys();
    for (const key of keys) {
      yield key;
    }
  }

  async *iValues() {
    const values = await this.values();
    for (const value of values) {
      yield value;
    }
  }
}

module.exports = CassMongo;
