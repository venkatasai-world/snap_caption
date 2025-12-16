import express from 'express';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import multer from 'multer';


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Force restart 1

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
  res.render("base")
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});



async function generateCaption(imageBuffer, mimeType) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const base64Image = imageBuffer.toString("base64");
  const contents = [
    { inlineData: { mimeType: mimeType || "image/jpeg", data: base64Image } },
    { text: "Generate a detailed and creative social media caption for this image. It should be descriptive and engaging, approximately 50-70 words long. Do not use Markdown formatting like bold or italics. Output only the plain text." },
  ];
  const response = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents: contents,
  });

  if (response.text && typeof response.text === 'function') {
    return response.text();
  } else if (typeof response.text === 'string') {
    return response.text;
  } else {
    // Try standard candidate access
    if (response.candidates && response.candidates.length > 0) {
      const part = response.candidates[0].content.parts[0];
      return part.text || JSON.stringify(part);
    }
    return "Error: Could not extract caption from response.";
  }
}

// Use memory storage to avoid saving files to disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/caption', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    console.log('received upload size:', req.file.size, 'type:', req.file.mimetype);
    const caption = await generateCaption(req.file.buffer, req.file.mimetype);
    res.json({ caption });
  } catch (e) {
    console.error("Generative AI Error:", e);
    const message = e.message || 'Unknown error';
    res.status(500).json({ error: `Generate failed: ${message}` });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});