const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hpn6v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        const productCollection = client.db('my-moon-db').collection('products');
        const userCollection = client.db('my-moon-db').collection('users');
        const orderCollection = client.db('my-moon-db').collection('orders');

        // Function for jwt
        function verifyJWT(req, res, next) {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: "Unauthorize access" })
            }
            const token = authHeader.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
                if (err) {
                    return res.status(403).send({ message: "forbidden access" })
                }
                req.decoded = decoded;
                next()
            });
        }

        //Function for admin verify
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next()
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }


        // For users
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true }

            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            res.send({ result, token })
        })

        // for all users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users)
        })


        app.delete('/user/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // Admin permission
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })
        // for Admin
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // For product
        app.get('/product', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })

        app.post('/product', async (req, res) => {
            const newProduct = req.body;
            const result = await productCollection.insertOne(newProduct);
            res.send(result);
        })

        // Delete Product
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/order', verifyJWT, async (req, res) => {
            const buyer = req.query.patient;
            const decodedEmail = req.decoded.email;
            if (buyer === decodedEmail) {
                const query = { buyer: buyer };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: "forbidden access" })
            }
        })

        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await orderCollection.findOne(query);
            res.send(order)
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { product: order.treatment, date: booking.date, patient: booking.patient }
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await orderCollection.insertOne(booking);
            return res.send({ success: true, result });
        })
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})