import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/browse', (req, res) => {
  res.json({
    success: true,
    plants: [{ id: 1, name: "Sunflower" }, { id: 2, name: "Rose" }],
    currentPage: 1,
    hasMorePages: false,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
