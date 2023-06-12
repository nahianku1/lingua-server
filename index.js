let express = require("express");
let cors = require("cors");
let dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_KEY);
let app = express();

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

app.post("/order", async (req, res) => {
  const { price } = req.body;
  console.log(`ordered`);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: parseFloat(price) * 100,
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.get("/", async (req, res) => {
  res.send(`Server is running!`);
});

app.post("/users", async (req, res) => {
  console.log(req.body);
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

app.post("/payhistory", async (req, res) => {
  console.log(req.body);
  try {
    await client.connect();
    let result = await client
      .db("summercampdb")
      .collection("payhistory")
      .insertOne({ ...req.body, date: new Date(Date.now()) });
    if (result.insertedId) {
      res.status(201).send(result.insertedId);
    }
    await client.close();
  } catch (e) {
    console.log(e);
  }
});

app.post("/jwt", async (req, res) => {
  await client.connect();
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
  res.send({ token, userinfo });
});

app.post("/add-class", async (req, res) => {
  console.log(req.body);
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("allclasses")
    .insertOne({
      ...req.body,
      status: "pending",
      enrolled: 0,
      feedback: "",
    });

  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Save`);
  }
});
app.post("/selected-class", async (req, res) => {
  console.log(112, req.body);
  let {
    _id,
    availableSeats,
    className,
    instructorEmail,
    instructorName,
    price,
    photo,
    status,
    enrolled,
    feedback,
    user,
  } = req.body;
  await client.connect();
  let isEnrolled = await client
    .db("summercampdb")
    .collection("selectedclasses")
    .findOne({
      classid: _id,
    });
  console.log(133, isEnrolled);
  console.log(134, isEnrolled?.classid == _id);
  if (isEnrolled) {
    if (isEnrolled.classid === _id && isEnrolled.user === user) {
      console.log(136, `Already Enrolled`);
      res.status(210).send();
    } else {
      let result = await client
        .db("summercampdb")
        .collection("selectedclasses")
        .insertOne({
          availableSeats,
          className,
          instructorEmail,
          instructorName,
          price,
          photo,
          status,
          enrolled,
          feedback,
          user,
          classid: _id,
        });

      if (result) {
        res.send(result);
        console.log(result);
        await client.close();
      } else {
        res.send(`Failed to Save`);
      }
    }
  } else {
    let result = await client
      .db("summercampdb")
      .collection("selectedclasses")
      .insertOne({
        availableSeats,
        className,
        instructorEmail,
        instructorName,
        price,
        photo,
        status,
        enrolled,
        feedback,
        user,
        classid: _id,
      });

    if (result) {
      res.send(result);
      console.log(result);
      await client.close();
    } else {
      res.send(`Failed to Save`);
    }
  }
});

app.post("/enrolled-class", async (req, res) => {
  console.log(req.body.user);
  await client.connect();
  let delres = await client
    .db("summercampdb")
    .collection("selectedclasses")
    .deleteOne({
      _id: new ObjectId(req.body._id),
    });

  if (delres) {
    let editres = await client
      .db("summercampdb")
      .collection("allclasses")
      .findOne({
        _id: new ObjectId(req.body.classid),
      });

    console.log(198, editres);
    let newseats = Number(editres.availableSeats) - 1;
    let newenroll = Number(editres.enrolled) + 1;
    console.log(205, newenroll, newseats);
    let filter = { _id: new ObjectId(req.body.classid) };
    let newres = await client
      .db("summercampdb")
      .collection("allclasses")
      .updateOne(filter, {
        $set: {
          availableSeats: newseats,
          enrolled: newenroll,
        },
      });
    if (newres) {
      let {
        availableSeats,
        className,
        instructorEmail,
        instructorName,
        price,
        photo,
        status,
        enrolled,
        feedback,
      } = await client
        .db("summercampdb")
        .collection("allclasses")
        .findOne({
          _id: new ObjectId(req.body.classid),
        });
      let result = await client
        .db("summercampdb")
        .collection("enrolledclasses")
        .insertOne({
          availableSeats,
          className,
          instructorEmail,
          instructorName,
          price,
          photo,
          status,
          enrolled,
          feedback,
          user: req.body.user,
          classid: req.body.classid,
        });
      res.send(result);
      console.log(result);
      await client.close();
    }
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
      .updateOne(filter, {
        $set: { status: "approved" },
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
      .updateOne(filter, {
        $set: { status: "denied" },
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
      .updateOne(filter, {
        $set: { role: "admin" },
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
      .updateOne(filter, {
        $set: { role: "instructor" },
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
      .updateOne(filter, {
        $set: { ...req.body },
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

app.delete("/selecteddelete/:id", async (req, res) => {
  console.log(req.params.id);
  try {
    await client.connect();
    let filter = { _id: new ObjectId(req.params.id) };
    let result = await client
      .db("summercampdb")
      .collection("selectedclasses")
      .deleteOne(filter);

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

app.get("/my-classes", async (req, res) => {
  console.log(req.query.email);

  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("allclasses")
    .find({
      instructorEmail: req.query.email,
    })
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.get("/users", async (req, res) => {
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("users")
    .find({})
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.get("/instructor", async (req, res) => {
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("users")
    .find({role:'instructor'})
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.get("/allclasses", async (req, res) => {
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("allclasses")
    .find({})
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});
app.get("/selectedclasses", async (req, res) => {
  console.log(req.query.email);
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("selectedclasses")
    .find({
      user: req.query.email,
    })
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.get("/payhistory", async (req, res) => {
  console.log(req.query.email);
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("payhistory")
    .find({
      user: req.query.email,
    })
    .sort({ date: -1 })
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.get("/enrolledclasses", async (req, res) => {
  console.log(req.query.email);
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("enrolledclasses")
    .find({
      user: req.query.email,
    })
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});
app.get("/approvedclasses", async (req, res) => {
  console.log("App Approved");
  await client.connect();
  let result = await client
    .db("summercampdb")
    .collection("allclasses")
    .find({
      status: "approved",
    })
    .toArray();
  if (result) {
    res.send(result);
    console.log(result);
    await client.close();
  } else {
    res.send(`Failed to Find`);
  }
});

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});
