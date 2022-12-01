const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();

const app = express();

// middle ware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.w79fzld.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {

    const servicesCollection = client.db('exPhotographyDB').collection('servicesDB');
    const reviewCollection = client.db('exPhotographyDB').collection('reviewDB');

    // jwt
    app.post('/jwt', (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
        res.send({ token })
    })

    // services
    app.get('/threeServices', async (req, res) => {
        const query = {};
        const cursor = servicesCollection.find(query);
        const services = await cursor.limit(3).toArray();
        res.send(services);
    });

    app.get('/services', async (req, res) => {
        const query = {};
        const cursor = servicesCollection.find(query);
        const services = await cursor.toArray();
        res.send(services);
    });

    app.post('/services', async (req, res) => {
        const service = req.body;
        const result = await servicesCollection.insertOne(service);
        res.send(result)
    });

    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const cursor = await servicesCollection.findOne(query);
        res.send(cursor)
    })

    // review

    app.get('/review/:id', async (req, res) => {
        const query = { serviceId: req.params.id };
        const cursor = reviewCollection.find(query).sort({ time: -1 });
        const review = await cursor.toArray();
        res.send(review)
    })
    app.get('/review', verifyJWT, async (req, res) => {

        const decoded = req.decoded;

        if (decoded.email !== req.query.email) {
            res.status(403).send({ message: 'unauthorized access' })
        }

        let query = {};
        if (req.query.email) {
            query = { email: req.query.email }
        }
        const cursor = reviewCollection.find(query).sort({ time: -1 });
        const review = await cursor.toArray();
        res.send(review)
    })


    app.post('/review', async (req, res) => {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result)
    });

    app.get('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await reviewCollection.findOne(query);
        res.send(result);
    })

    app.patch('/reviews/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const userText = req.body;
        const updatedDoc = {
            $set: {
                reviewText: userText.reviewText,
            }
        }
        const result = await reviewCollection.updateOne(filter, updatedDoc);
        res.send(result);
    })

    app.delete('/review/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await reviewCollection.deleteOne(query);
        res.send(result);
    })

}

run().catch(error => console.error(error))

app.get('/', (req, res) => {
    res.send('Photography website server running');
})

app.listen(port, () => {
    console.log(`The photography server is running on port : ${port}`);
})