// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');



// Initialize the app
const app = express();
const PORT = 4002;

// Enable CORS
app.use(cors());

// Middleware
app.use(bodyParser.json());

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/samachar'; // Replace with your MongoDB URI
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, family: 4  })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose schema and model
const ItemSchema = new mongoose.Schema({
    User: { type: String, required: false },
    
    NewsDscr: { type: String, required: true },
    Tags: { type: String, required: false }

});
const Item = mongoose.model('Item', ItemSchema);

app.patch('/news/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(id)
  
    // Validate the status input
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }
  
    try {
      const newsArticle = await Item.findById(id);
      if (!newsArticle) {
        return res.status(404).json({ message: 'News article not found' });
      }
  
      // Update the status of the news article
      newsArticle.Status = status;
      await newsArticle.save();
      res.json(newsArticle);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // Define a Mongoose schema and model for archived articles
const ArchivedItemSchema = new mongoose.Schema({
    TimeStamp: { type: Date, default: Date.now },
    NewsHeadline: { type: String, required: true },
    User: { type: String, required: false },
    PublishedBy: { type: String, required: false },
    NewsDscr: { type: String, required: true },
    Tags: { type: String, required: false },
    Image: { type: String, required: false },  // Store image path
    Status: { type: String, required: false, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    Category: { type: String, required: true }
});

// Archive model for archived articles
const ArchivedItem = mongoose.model('ArchivedNews', ArchivedItemSchema);

// API to Archive and Delete a News Article (DELETE /news/:id)
app.delete('/news/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
        // Find the article to be archived and deleted
        const newsArticle = await Item.findById(id);
        if (!newsArticle) {
            return res.status(404).json({ message: 'News article not found' });
        }
  
        // Archive the article by creating a new ArchivedItem with the same data
        const archivedArticle = new ArchivedItem({
            NewsHeadline: newsArticle.NewsHeadline,
            User: newsArticle.User,
            PublishedBy: newsArticle.PublishedBy,
            NewsDscr: newsArticle.NewsDscr,
            Tags: newsArticle.Tags,
            Image: newsArticle.Image,
            Status: newsArticle.Status,
            Category: newsArticle.Category,
        });
  
        // Save the archived article
        await archivedArticle.save();
  
        // Now, delete the original article from the database
        await Item.findByIdAndDelete(id);
  
        res.status(200).json({ message: 'News article archived and deleted successfully' });
    } catch (err) {
        console.error('Error archiving and deleting article:', err);
        res.status(500).json({ message: 'Error archiving and deleting article', error: err.message });
    }
});


app.get('/archived', async (req, res) => {
    try {
        const archivedArticles = await ArchivedItem.find(); // Fetch all archived articles
        res.json(archivedArticles);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived articles' });
    }
});


  // Set up multer to handle file uploads (store files in memory)
const storage = multer.memoryStorage(); // Store files in memory, not in disk
const upload = multer({ storage });






// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});