PhytoSentry Real AI Model Integration
====================================

Included model files:
- backend/model/phytosentry_model_finetuned_best.keras
- backend/model/class_names.json
- backend/model/classification_report.csv
- backend/model/training_history_finetune.json

Backend endpoints:
- GET  /api/health
- GET  /api/model-info
- POST /api/analyze

How prediction works:
1. User uploads a leaf image from the frontend.
2. FastAPI saves the image under backend/uploads/.
3. TensorFlow loads the trained .keras model lazily on first scan.
4. The image is resized to 224x224 and passed to the model.
5. Backend returns disease name, scientific name, confidence, severity, top-3 predictions, symptoms, treatment, and prevention tips.

Important deployment note:
- requirements.txt now includes tensorflow-cpu==2.18.0.
- On free hosting, first scan can be slow because the model loads on first request.
- If Render free plan memory is too low, deploy backend on Railway, Hugging Face Spaces, or a VPS.

Local run:
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

Frontend run:
cd frontend
npm install
npm run dev


IMPORTANT FIX:
Uploaded images now never fall back to the static fallback result. If the model/backend fails, the frontend shows a clear backend error instead. Start the backend before scanning:

cd backend
pip install -r requirements.txt
python main.py

Then start frontend separately.
