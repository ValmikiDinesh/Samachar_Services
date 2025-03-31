// Import required modules
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();  // Loads environment variables from .env file

// Initialize Express app
const app = express();
const port = 4001;

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// AWS S3 Client Configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schema for News
const NewsSchema = new mongoose.Schema({
    TimeStamp: { type: Date, default: Date.now },
    NewsHeadline: { type: String, required: true },
    User: { type: String, required: false },
    PublishedBy: { type: String, required: false },
    NewsDscr: { type: String, required: true },
    Tags: { type: String, required: false },
    Image: { type: String, required: false },  // URL to the image stored in S3
    Status: { type: String, required: false, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    Category: { type: String, required: true },
});

const News = mongoose.model('News', NewsSchema);

// Mongoose Schema for Category
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
});

const Category = mongoose.model('Category', CategorySchema);

// Multer Memory Storage Configuration (No files saved locally)
const storage = multer.memoryStorage();  // Memory storage ensures files are not saved locally
const upload = multer({ storage: storage });

// POST endpoint to upload news article and image to S3
app.post('/publish', upload.single('Image'), async (req, res) => {
    const { NewsHeadline, User, PublishedBy, NewsDscr, Tags, Category } = req.body;
    const file = req.file;  // The uploaded file is available here

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    // Log file to verify it's in memory (Buffer)
    console.log('Uploaded file:', file);

    // S3 upload parameters
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME, // Bucket name
        Key: `${Date.now()}-${file.originalname}`,  // Unique file name with timestamp
        Body: file.buffer,  // The file buffer (in-memory)
        ContentType: file.mimetype,  // Mime type of the file
    };

    try {
        // Upload file to S3
        const command = new PutObjectCommand(params);
        const data = await s3.send(command);

        // Generate S3 URL for the uploaded image
        const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;

        // Save the news data to MongoDB, including the S3 URL
        const newNews = new News({
            NewsHeadline,
            User,
            PublishedBy,
            NewsDscr,
            Tags,
            Image: imageUrl,  // Store the URL of the uploaded image in MongoDB
            Category,
        });

        await newNews.save();

        // Respond to the client with success
        res.status(200).json({
            message: 'News data and image uploaded to S3 successfully',
            receivedData: {
                NewsHeadline,
                User,
                PublishedBy,
                NewsDscr,
                Tags,
                Image: imageUrl,
                Category,
            },
        });
    } catch (err) {
        console.error('Error uploading to S3:', err);
        res.status(500).json({ message: 'Error uploading image to S3', error: err });
    }
});

// GET endpoint to retrieve all news articles
app.get('/news', async (req, res) => {
    try {
        // Retrieve all news articles from MongoDB
        const newsArticles = await News.find();

        if (!newsArticles || newsArticles.length === 0) {
            return res.status(404).json({ message: 'No news articles found' });
        }

        // Respond with the retrieved news articles
        res.status(200).json({
            message: 'News articles retrieved successfully',
            data: newsArticles,
        });
    } catch (err) {
        console.error('Error retrieving news articles:', err);
        res.status(500).json({ message: 'Error retrieving news articles', error: err });
    }
});

// API to Add a Category (POST /categories)
app.post('/categories', async (req, res) => {
    const { name } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Category name is required and must be a non-empty string' });
    }

    try {
        // Check if category already exists
        const existingCategory = await Category.findOne({ name: name.trim() });
        if (existingCategory) {
            return res.status(409).json({ message: 'Category already exists' });
        }

        // Create new category
        const newCategory = new Category({ name: name.trim() });
        await newCategory.save();

        res.status(201).json({ message: 'Category added successfully', category: newCategory });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ message: 'Server error while adding category', error: error.message });
    }
});

// API to Get All Categories (GET /categories)
app.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find(); // Return all categories
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories', error: error.message });
    }
});





// **GET API endpoint** to fetch all the articles
app.get('/articles', (req, res) => {
    News.find({Status: "approved"})
        .then((articles) => {
            if (articles.length === 0) {
                return res.status(404).json({ message: 'No articles found' });
            }
            res.status(200).json(articles); // Return the articles as JSON
        })
        .catch(err => {
            console.error('Error fetching articles:', err);
            res.status(500).json({ message: 'Error fetching articles', error: err });
        });
});



// **GET API endpoint** to fetch all the articles
app.get('/carousalarticles', (req, res) => {
    News.find({Status: "approved"}).sort({_id:-1}).limit(4)
        .then((articles) => {
            if (articles.length === 0) {
                return res.status(404).json({ message: 'No articles found' });
            }
            res.status(200).json(articles); // Return the articles as JSON
        })
        .catch(err => {
            console.error('Error fetching articles:', err);
            res.status(500).json({ message: 'Error fetching articles', error: err });
        });
});

app.post('/articles/Status', (req, res) => {
    News.find(
        { Status:  req.body.Status  }
       
    )
        .then((articles) => {
            if (articles.length === 0) {
                return res.status(404).json({ message: 'No articles found' });
            }
            res.status(200).json(articles); // Return the articles as JSON
        })
        .catch(err => {
            console.error('Error fetching articles:', err);
            res.status(500).json({ message: 'Error fetching articles', error: err });
        });
});


app.post('/articles/selectedcategory', (req, res) => {
    console.log("Category:" + req.body.Category)
    News.find(
        { Status: "approved", Category:  req.body.Category  }
       
    )
        .then((articles) => {
            if (articles.length === 0) {
                return res.status(404).json({ message: 'No articles found' });
            }
            res.status(200).json(articles); // Return the articles as JSON
        })
        .catch(err => {
            console.error('Error fetching articles:', err);
            res.status(500).json({ message: 'Error fetching articles', error: err });
        });
});


app.post('/articles/search', (req, res) => {
    News.find(
        { Status: "approved", NewsHeadline: { $regex: req.body.searchQuery, $options: "i" } }
    )
        .then((articles) => {
            if (articles.length === 0) {
                return res.status(200).json({ message: 'No articles found' }); // Changed to 200
            }
            res.status(200).json(articles);
        })
        .catch(err => {
            console.error('Error fetching articles:', err);
            res.status(500).json({ message: 'Error fetching articles', error: err });
        });
});


  



// API to Add a Category (POST /categories)
app.post('/categories', async (req, res) => {
    const { name } = req.body;
  
    // Validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required and must be a non-empty string' });
    }
  
    try {
      // Check if category already exists
      const existingCategory = await Category.findOne({ name: name.trim() });
      if (existingCategory) {
        return res.status(409).json({ message: 'Category already exists' });
      }
  
      // Create new category
      const newCategory = new Category({ name: name.trim() });
      await newCategory.save();
  
      res.status(201).json({ message: 'Category added successfully', category: newCategory });
    } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).json({ message: 'Server error while adding category', error: error.message });
    }
  });
  
  // API to Get All Categories (GET /categories)
  app.get('/categories', async (req, res) => {
    try {
      const categories = await Category.find(); // Return only names, exclude _id
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Server error while fetching categories', error: error.message });
    }
  });


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
