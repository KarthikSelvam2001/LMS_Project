const { MongoClient } = require('mongodb');

async function fix() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected.');
    
    const db = client.db('lms_Project_Live');
    const collection = db.collection('certificates');
    
    const indexes = await collection.indexes();
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));
    
    const hasCertNumIndex = indexes.some(idx => idx.name === "certificateNumber_1");

    if (hasCertNumIndex) {
      console.log("Dropping index 'certificateNumber_1'...");
      await collection.dropIndex("certificateNumber_1");
      console.log("Index dropped successfully.");
    } else {
      console.log("Index 'certificateNumber_1' not found, no action needed.");
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

fix();
