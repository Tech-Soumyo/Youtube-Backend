export const DB_NAME = "BackendProject";

// import {MongoClient} from "mongodb"


// // Replace the uri string with your MongoDB deployment's connection string.
// const uri =
//   "mongodb+srv://soumyotechdeep:r0ofCa4jc1oYxzTd@backendproject.0ujrrwb.mongodb.net";

// const client = new MongoClient(uri);

// async function run() {
//   try {
//     await client.connect();

//     const database = client.db("sample_mflix");
//     const movies = database.collection("movies");

//     // Query for a movie that has the title 'Back to the Future'
//     const query = { title: "Back to the Future" };
//     const movie = await movies.findOne(query);

//     console.log(movie);
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);