const express = require('express');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Initialize Firestore + Gemini (your free credits cover this)
admin.initializeApp({
  projectId: process.env.GCP_PROJECT_ID,
});
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ========== NAVIRA (Customer Booking) ==========
app.get('/api/halls', async (req, res) => {
  const halls = await db.collection('halls').get();
  res.json(halls.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.post('/api/book', async (req, res) => {
  const { hallId, customerName, date, time } = req.body;
  const booking = await db.collection('bookings').add({
    hallId, customerName, date, time, status: 'confirmed', timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  res.json({ success: true, bookingId: booking.id });
});

// ========== WEDDING PLACES (Vendor Dashboard) ==========
app.get('/api/vendor/:hallId/bookings', async (req, res) => {
  const bookings = await db.collection('bookings')
    .where('hallId', '==', req.params.hallId).get();
  res.json(bookings.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

// ========== AI FINANCE INSIGHTS (Premium) ==========
app.post('/api/ai/finance', async (req, res) => {
  // Premium check (Firestore subscription status)
  const userDoc = await db.collection('users').doc(req.body.userId).get();
  if (!userDoc.data()?.isPremium) {
    return res.status(402).json({ error: 'Upgrade to Premium for AI insights' });
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(`
    Analyze this hall's data for OPEX/CAPEX optimization:
    Bookings: ${JSON.stringify(req.body.bookings)}
    Expenses: ${req.body.expenses}
    
    Give 3 actionable recommendations to save money.
  `);
  res.json({ insights: result.response.text() });
});

app.listen(8080, () => console.log('Navira + Wedding Places API running'));
