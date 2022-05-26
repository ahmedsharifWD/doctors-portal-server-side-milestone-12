const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const { query } = require('express');
const res = require('express/lib/response');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();


// Middleware
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8pxhh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




async function run() {
    try {
        await client.connect()
        const serviceCollection = client.db('doctors_portal').collection('services');
        const bookingCollection = client.db('doctors_portal').collection('booking');

        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const service = await cursor.toArray();
            res.send(service);
        });


        // Warning: This is not the proper way to query multiple collection. 
        // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            const date = req.query.date;

            // step 1:  get all services
            const services = await serviceCollection.find().toArray();

            // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each service
            services.forEach(service => {
                // step 4: find bookings for that service. output: [{}, {}, {}, {}]
                const serviceBookings = bookings.filter(book => book.treatment === service.name);

                // step 5: select slots for the service Bookings: ['', '', '', '']
                const bookedSlots = serviceBookings.map(book => book.slot);

                // step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));

                //step 7: set available to slots to make it easier 
                service.slots = available;
            });


            res.send(services);
        })

        /**
         * API Naming Convention
         * app.get('/booking') // get all the booking in the collection. or get more then one or by filter
         * app.get('/booking/:id') //get a specific booking patient
         * app.post('/booking') // add a new booking
         * app.patch('/booking/:id') // update any one booking or doctor
         * app.delete('/booking/:id') // Delete any doctor or patient or booking
         */

        // show data on dashboard
        app.get('/booking', async (req, res) => {
            const patient = req.query.patient; ///////////////////////////////////////------------------------------------
            const query = { patient: patient };
            const cursor = bookingCollection.find(query);
            const booking = await cursor.toArray();
            res.send(booking);
        })

        // take patient information by clicking "BOOK APPOINTMENT"
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            // one person or patient can use one doctor at a time. They can't use one doctor in one day again and again
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient };
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }

            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
        })



    }
    finally {

    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello From Doctor Uncle!')
})

app.listen(port, () => {
    console.log(`Doctors App listening on port ${port}`)
});