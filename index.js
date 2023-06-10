let express = require("express");
let cors = require("cors");
let dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
let app = express();
dotenv.config();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH"],
  })
);

let PORT = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const uri = process.env.DB_URL;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", async (req, res) => {
  res.send(`Server is running!`);
});

app.post("/users", async (req, res) => {
  console.log(req.body)
  try {
    await client.connect();
    let isExists = await client
      .db("summercampdb")
      .collection("users")
      .findOne({ email: req.body.email });
    if (isExists) {
      res.status(200).send(`User exists!`);
      return;
    }
    let result = await client
      .db("summercampdb")
      .collection("users")
      .insertOne({ ...req.body, role: "student" });
    if (result.insertedId) {
      res.status(201).send(result.insertedId);
    }
    await client.close();
  } catch (e) {
    console.log(e);
  }
});


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

app.post("/jwt", async (req, res) => {
  await client.connect()
  let userinfo = await client
    .db("summercampdb")
    .collection("users")
    .findOne({ email: req.body.email });
  const token = jwt.sign(
    { email: req.body.email, role: userinfo?.role },
    process.env.SECRET,
    { expiresIn: "1h" }
  );
  console.log(token);
  res.send({token, userinfo});
});

app.post("/add-class", async (req, res) => {
  console.log(req.body);
    await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("allclasses")
    .insertOne({
      ...req.body,
      status: 'pending',
      enrolled: 0,
      feedback: ''
    });

  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Save`);
  }
});

app.put("/approve/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("allclasses")
      .updateOne(filter,{
        $set:{status:"approved"}
      });
  
    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Approve`);
    }
  } catch (error) {
    console.log(error.message);
  }
 
});

app.put("/deny/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("allclasses")
      .updateOne(filter,{
        $set:{status:"denied"}
      });
  
    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Approve`);
    }
  } catch (error) {
    console.log(error.message);
  }
 
});

app.put("/makeadmin/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("users")
      .updateOne(filter,{
        $set:{role:"admin"}
      });
  
    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Approve`);
    }
  } catch (error) {
    console.log(error.message);
  }
 
});

app.put("/makeinstructor/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("users")
      .updateOne(filter,{
        $set:{role:"instructor"}
      });
  
    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Approve`);
    }
  } catch (error) {
    console.log(error.message);
  }
 
});

app.put("/addfeedback/:id", async (req, res) => {
  console.log(req.params.id);
  console.log(req.body);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("allclasses")
      .updateOne(filter,{
        $set:{...req.body}
      });
  
    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Approve`);
    }
  } catch (error) {
    console.log(error.message);
  }
 
});

app.get('/my-classes', async(req, res) =>{
  console.log(req.query.email);
  
    await client.connect();
    let result = await client
      .db("summercampdb")
      .collection("allclasses")
      .find({
        instructorEmail:req.query.email
      }).toArray();
      if (result) {
        res.send(result);
        console.log(result);
        await client.close();
      } else {
        res.send(`Failed to Find`);
      }
   
 
})

app.get('/users', async(req, res) =>{
  
    await client.connect();
    let result = await client
      .db("summercampdb")
      .collection("users")
      .find({
      }).toArray();
      if (result) {
        res.send(result);
        console.log(result);
        await client.close();
      } else {
        res.send(`Failed to Find`);
      }
   
 
})
app.get('/allclasses', async(req, res) =>{
  
    await client.connect();
    let result = await client
      .db("summercampdb")
      .collection("allclasses")
      .find({
      }).toArray();
      if (result) {
        res.send(result);
        console.log(result);
        await client.close();
      } else {
        res.send(`Failed to Find`);
      }
   
 
})

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
