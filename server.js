import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Helper function to load all JSON files from the 'data' directory
const loadAllJsonData = () => {
    const dataDir = path.join(__dirname, 'data');
    const files = fs.readdirSync(dataDir).filter(file => file.startsWith('plant_') && file.endsWith('.json'));
    
    const plants = files.map(file => {
      const filePath = path.join(dataDir, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    });
  
    // Flatten the array of arrays (if needed)
    return plants.flat();
};


app.post('/api/browse', (req, res) => {
    const page = parseInt(req.body.page) || 1;  // Default to page 1
    const plants = loadAllJsonData(); // Load plant data

    const itemsPerPage = 10; // Number of items per page
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = page * itemsPerPage;

    const pagePlants = plants.slice(startIndex, endIndex); // get plants for current pg
    const hasMorePages = endIndex < plants.length; // check if theres more pgs

    res.json({
        success: true,
        plants: pagePlants,
        currentPage: page,
        hasMorePages,
    });
});

app.post('/api/search', (req, res) => {
    const query = req.body.query || ''; // example: search term
    const plants = loadAllJsonData('plants.json'); // Load plant data
    const results = plants.filter(plant => plant.name.includes(query)); // Search by plant name
  
    res.json({ success: true, results });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Here you can validate login (this example is simple)
    if (username === 'admin' && password === 'password123') {
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/createaccount', (req, res) => {
    const { username, password } = req.body;
    // Here you can save the new account to a database (this is just a mock)
    res.json({ success: true, message: 'Account created successfully' });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
