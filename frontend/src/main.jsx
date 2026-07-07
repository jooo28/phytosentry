import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import { createRoot } from "react-dom/client";
import {
  Leaf, UploadCloud, BarChart3, ShieldCheck, Camera, CheckCircle2,
  ArrowRight, Menu, User, CreditCard, Settings, History, FileText, Lock,
  Mail, Phone, Moon, Bell, Globe, Download, Printer, LogIn, UserPlus, X,
  ScanLine, Sun, Zap, AlertTriangle, Users, Activity, ChevronRight,
  Star, Award, Cloud, Droplets, Wind, ThermometerSun, MapPin, MessageCircle,
  Shield, Layers, RefreshCw, LogOut, Microscope, FlaskConical, Wheat,
  Bug, Thermometer, Clock, Calendar, Search, Plus, BookOpen, Cpu} from "lucide-react";
import "./styles.css";
import logoImg from "./phytoosentry-logo.png";
const API = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
function getAuthToken(){try{return localStorage.getItem("ps_token")||""}catch{return ""}}
function authHeaders(extra={}){const token=getAuthToken();return token?{...extra,Authorization:`Bearer ${token}`}:{...extra}}

const LANG = {
  en: {
    brand:"PhytoSentry", tagline:"From Leaf to Life", slogan:"From Leaf to Life — Detect, Protect, Grow",
    home:"Home", scan:"Scan Leaf", dashboard:"Dashboard", history:"History", about:"About",
    profile:"Profile", payments:"Payments", settings:"Settings", treatment:"Treatment",
    signin:"Sign In", signup:"Sign Up",
    heroTitle:"AI-Powered Plant Disease Detection",
    heroSub:"Upload a leaf image. PhytoSentry detects diseases, shows confidence scores, and gives expert treatment plans instantly.",
    scanNow:"Scan a Leaf Now", getStarted:"Create Free Account",
    uploadTitle:"Upload Leaf Image", uploadSub:"Upload or capture a clear image of the affected leaf.",
    analyzeBtn:"Analyze Leaf", continueDemo:"Continue Demo",
    cameraBtn:"Use Camera",
    darkMode:"Dark Mode", language:"Language", notifications:"Notifications",
    experts:"Experts", weather:"Weather", admin:"Admin",
    report:"Report", print:"Print", pdf:"PDF", bangla:"Bangla", english:"English",
  },
  bn: {
    brand:"PhytoSentry", tagline:"পাতা থেকে প্রাণ", slogan:"পাতা থেকে প্রাণ — শনাক্ত, সুরক্ষা, বিকাশ",
    home:"হোম", scan:"পাতা স্ক্যান", dashboard:"ড্যাশবোর্ড", history:"ইতিহাস", about:"অ্যাবাউট",
    profile:"প্রোফাইল", payments:"পেমেন্ট", settings:"সেটিংস", treatment:"চিকিৎসা",
    signin:"সাইন ইন", signup:"সাইন আপ",
    heroTitle:"এআই-চালিত উদ্ভিদ রোগ শনাক্তকরণ",
    heroSub:"পাতার ছবি আপলোড করুন। PhytoSentry রোগ শনাক্ত করে, আস্থার স্কোর দেখায় এবং তাৎক্ষণিক চিকিৎসা পরিকল্পনা দেয়।",
    scanNow:"এখনই স্ক্যান করুন", getStarted:"বিনামূল্যে অ্যাকাউন্ট খুলুন",
    uploadTitle:"পাতার ছবি আপলোড করুন", uploadSub:"আক্রান্ত পাতার একটি স্পষ্ট ছবি আপলোড করুন।",
    analyzeBtn:"পাতা বিশ্লেষণ করুন", continueDemo:"ডেমো চালিয়ে যান",
    cameraBtn:"ক্যামেরা ব্যবহার করুন",
    darkMode:"ডার্ক মোড", language:"ভাষা", notifications:"বিজ্ঞপ্তি",
    experts:"বিশেষজ্ঞ", weather:"আবহাওয়া", admin:"অ্যাডমিন",
    report:"রিপোর্ট", print:"প্রিন্ট", pdf:"পিডিএফ", bangla:"বাংলা", english:"ইংরেজি",
  }
};

const STATIC_BN = {
  "NEXT-GEN AGRICULTURAL AI · BANGLADESH":"নেক্সট-জেন কৃষি এআই · বাংলাদেশ",
  "Detect Plant Disease Before It Spreads":"রোগ ছড়ানোর আগেই উদ্ভিদের রোগ শনাক্ত করুন",
  "Upload a leaf, scan symptoms, get confidence scores and instant treatment guidance for healthier crops.":"পাতার ছবি আপলোড করুন, লক্ষণ বিশ্লেষণ করুন, আস্থার স্কোর ও তাৎক্ষণিক চিকিৎসা নির্দেশনা পান।",
  "Start Leaf Scan":"পাতা স্ক্যান শুরু করুন",
  "Create Account":"অ্যাকাউন্ট তৈরি করুন",
  "LIVE DIAGNOSIS":"লাইভ ডায়াগনসিস",
  "Tomato Leaf":"টমেটো পাতা",
  "ONLINE":"অনলাইন",
  "Early Blight Risk":"আর্লি ব্লাইট ঝুঁকি",
  "Moderate severity · 93.6% confidence":"মাঝারি তীব্রতা · ৯৩.৬% আস্থা",
  "Leaf Integrity":"পাতার অবস্থা",
  "Pathogen Scan":"রোগজীবাণু স্ক্যান",
  "Risk Forecast":"ঝুঁকি পূর্বাভাস",
  "View Treatment Plan":"চিকিৎসা পরিকল্পনা দেখুন",
  "How It":"কিভাবে এটি",
  "Works":"কাজ করে",
  "Three simple steps to protect your crops":"ফসল সুরক্ষার তিনটি সহজ ধাপ",
  "Upload Photo":"ছবি আপলোড",
  "Take a clear photo of the affected leaf using your phone camera or gallery.":"ফোন ক্যামেরা বা গ্যালারি থেকে আক্রান্ত পাতার পরিষ্কার ছবি দিন।",
  "AI Analysis":"এআই বিশ্লেষণ",
  "Deep learning scans 38+ diseases with 98.2% accuracy in under 3 seconds.":"ডিপ লার্নিং ৩ সেকেন্ডের কম সময়ে ৩৮+ রোগ ৯৮.২% নির্ভুলতায় বিশ্লেষণ করে।",
  "Get Treatment":"চিকিৎসা পান",
  "Receive severity scores and expert organic, biological & chemical plans.":"তীব্রতার স্কোর এবং জৈব, জীবাণুভিত্তিক ও রাসায়নিক চিকিৎসা পরিকল্পনা পান।",
  "Everything You":"আপনার যা যা",
  "Need":"প্রয়োজন",
  "Powerful AI tools built for Bangladesh farmers":"বাংলাদেশের কৃষকদের জন্য তৈরি শক্তিশালী এআই টুলস",
  "AI Leaf Scan":"এআই পাতা স্ক্যান",
  "98.2% accurate detection from a single photo.":"একটি ছবিতেই ৯৮.২% নির্ভুল শনাক্তকরণ।",
  "Top-3 Predictions":"সেরা ৩টি পূর্বাভাস",
  "Confidence-ranked results with severity breakdown.":"আস্থার স্কোর অনুযায়ী ফলাফল ও তীব্রতার বিশ্লেষণ।",
  "Treatment Plans":"চিকিৎসা পরিকল্পনা",
  "Organic, biological & chemical solutions.":"জৈব, জীবাণুভিত্তিক ও রাসায়নিক সমাধান।",
  "PDF Reports":"পিডিএফ রিপোর্ট",
  "Download full scan reports anytime.":"যেকোনো সময় সম্পূর্ণ স্ক্যান রিপোর্ট ডাউনলোড করুন।",
  "Weather Risk":"আবহাওয়া ঝুঁকি",
  "Real-time disease risk based on local weather.":"স্থানীয় আবহাওয়ার ভিত্তিতে রিয়েল-টাইম রোগ ঝুঁকি।",
  "Expert Connect":"বিশেষজ্ঞ সংযোগ",
  "Direct access to agricultural experts.":"কৃষি বিশেষজ্ঞদের সঙ্গে সরাসরি যোগাযোগ।",
  "Farmers":"কৃষকেরা",
  "Love It":"এটি পছন্দ করেন",
  "Real stories from real farmers":"বাস্তব কৃষকদের বাস্তব অভিজ্ঞতা",
  "Ready to protect your crops?":"আপনার ফসল সুরক্ষার জন্য প্রস্তুত?",
  "Join 50,000+ farmers already using PhytoSentry AI":"৫০,০০০+ কৃষক ইতিমধ্যে PhytoSentry AI ব্যবহার করছেন",
  "Scan Your First Leaf":"আপনার প্রথম পাতা স্ক্যান করুন",
  "Supported Crops":"সমর্থিত ফসল",
  "High Fungal Risk Today":"আজ ছত্রাকের ঝুঁকি বেশি",
  "View Details":"বিস্তারিত দেখুন",
  "Home":"হোম", "Scan Leaf":"পাতা স্ক্যান", "Dashboard":"ড্যাশবোর্ড", "History":"ইতিহাস", "About":"সম্পর্কে", "Payments":"পেমেন্ট", "Settings":"সেটিংস", "Treatment":"চিকিৎসা", "Experts":"বিশেষজ্ঞ", "Weather":"আবহাওয়া", "Admin":"অ্যাডমিন",
  "Sign In":"সাইন ইন", "Sign Up":"সাইন আপ", "Welcome Back":"আবার স্বাগতম", "Join PhytoSentry":"PhytoSentry-তে যোগ দিন", "Reset Password":"পাসওয়ার্ড রিসেট করুন",
  "AI-powered plant disease detection for smarter farming across Bangladesh.":"বাংলাদেশজুড়ে স্মার্ট কৃষির জন্য এআই-চালিত উদ্ভিদ রোগ শনাক্তকরণ।",
  "98.2% detection accuracy":"৯৮.২% শনাক্তকরণ নির্ভুলতা", "38+ plant diseases covered":"৩৮+ উদ্ভিদ রোগ অন্তর্ভুক্ত", "Instant PDF reports":"তাৎক্ষণিক পিডিএফ রিপোর্ট", "Expert consultation":"বিশেষজ্ঞ পরামর্শ",
  "Full Name":"পূর্ণ নাম", "Phone Number":"ফোন নম্বর", "Email Address":"ইমেইল ঠিকানা", "Password":"পাসওয়ার্ড", "Send Email Verification":"ইমেইল যাচাইকরণ পাঠান", "Send Reset Link":"রিসেট লিংক পাঠান", "Reset with Token":"টোকেন দিয়ে রিসেট করুন", "Reset Token":"রিসেট টোকেন", "New Password":"নতুন পাসওয়ার্ড", "Forgot Password?":"পাসওয়ার্ড ভুলে গেছেন?", "Already have a reset token?":"রিসেট টোকেন আছে?", "← Back to Sign In":"← সাইন ইন-এ ফিরুন",
  "Upload / Scan Leaf":"পাতা আপলোড / স্ক্যান", "Auto Detect is recommended. Crop selection is only a hint and will not override AI prediction.":"ভালো ফলাফলের জন্য আগে ফসলের ধরন নির্বাচন করুন।", "Select Crop Type":"ফসলের ধরন নির্বাচন করুন", "Drag & drop your leaf image here":"পাতার ছবি এখানে ড্র্যাগ করে দিন", "or click to browse files":"অথবা ফাইল ব্রাউজ করতে ক্লিক করুন", "JPG · PNG · WEBP · up to 10MB":"JPG · PNG · WEBP · সর্বোচ্চ ১০MB", "Ready to Analyze":"বিশ্লেষণের জন্য প্রস্তুত", "Photo Tips":"ছবির টিপস", "Use natural daylight":"প্রাকৃতিক আলো ব্যবহার করুন", "Focus on the affected area":"আক্রান্ত অংশে ফোকাস করুন", "Avoid blurry or dark images":"ঝাপসা বা অন্ধকার ছবি এড়িয়ে চলুন", "Include both healthy and affected parts":"সুস্থ ও আক্রান্ত দুই অংশই রাখুন",
  "Analysis in Progress":"বিশ্লেষণ চলছে", "AI analyzes the leaf and extracts key insights.":"এআই পাতা বিশ্লেষণ করে গুরুত্বপূর্ণ তথ্য বের করছে।", "Analyzing Your Leaf...":"আপনার পাতা বিশ্লেষণ হচ্ছে...", "Our deep learning model is processing your image.":"আমাদের ডিপ লার্নিং মডেল আপনার ছবি প্রক্রিয়াকরণ করছে।", "complete":"সম্পন্ন", "Image enhancement":"ছবি উন্নতকরণ", "Feature extraction":"ফিচার বের করা", "Pattern recognition":"প্যাটার্ন শনাক্তকরণ", "Disease classification":"রোগ শ্রেণিবিন্যাস", "Confidence scoring":"আস্থা স্কোর নির্ধারণ",
  "Detection Result":"শনাক্তকরণের ফলাফল", "Disease name, confidence score, and severity analysis.":"রোগের নাম, আস্থার স্কোর ও তীব্রতা বিশ্লেষণ।", "Confidence Score":"আস্থার স্কোর", "Severity":"তীব্রতা", "Affected Area":"আক্রান্ত অংশ", "Stage":"অবস্থা", "Crop":"ফসল", "Disease Overview":"রোগের বিবরণ", "Symptoms":"লক্ষণ",
  "Treatment Recommendations":"চিকিৎসা সুপারিশ", "Expert-backed solutions and prevention tips.":"বিশেষজ্ঞ-সমর্থিত সমাধান ও প্রতিরোধ টিপস।", "Prevention Tips":"প্রতিরোধমূলক পরামর্শ", "Set Treatment Reminder":"চিকিৎসার রিমাইন্ডার সেট করুন", "Get notified for spray schedules, watering times, and follow-up checks.":"স্প্রে সময়সূচি, পানি দেওয়ার সময় ও ফলো-আপ চেকের নোটিফিকেশন পান।", "Set Reminder":"রিমাইন্ডার সেট করুন", "Print EN":"প্রিন্ট EN", "Print BN":"প্রিন্ট বাংলা", "PDF EN":"পিডিএফ EN", "PDF BN":"পিডিএফ বাংলা",
  "Track analyses, trends, and export reports.":"বিশ্লেষণ, ট্রেন্ড ও রিপোর্ট এক্সপোর্ট ট্র্যাক করুন।", "Total Scans":"মোট স্ক্যান", "Diseases Found":"শনাক্ত রোগ", "Healthy Leaves":"সুস্থ পাতা", "Avg Confidence":"গড় আস্থা", "Scan Activity (Last 7 Days)":"স্ক্যান কার্যক্রম (শেষ ৭ দিন)", "Disease Distribution":"রোগের বণ্টন", "All previous scans with individual report downloads.":"প্রতিটি রিপোর্ট ডাউনলোডসহ আগের সব স্ক্যান।", "All Scans":"সব স্ক্যান", "Search crop or disease...":"ফসল বা রোগ খুঁজুন...", "Disease":"রোগ", "Confidence":"আস্থা", "Date":"তারিখ", "Report":"রিপোর্ট",
  "User Profile":"ব্যবহারকারীর প্রোফাইল", "Your account information and statistics.":"আপনার অ্যাকাউন্ট তথ্য ও পরিসংখ্যান।", "Email:":"ইমেইল:", "Verified":"যাচাইকৃত", "Pending":"অপেক্ষমাণ", "Joined:":"যোগদান:", "Reports Saved":"সংরক্ষিত রিপোর্ট", "Edit Profile":"প্রোফাইল সম্পাদনা",
  "ABOUT PHYTOSENTRY":"PHYTOSENTRY সম্পর্কে", "Our mission, technology, and team.":"আমাদের লক্ষ্য, প্রযুক্তি ও টিম।", "From Leaf to Life":"পাতা থেকে প্রাণ", "Choose Your Plan":"আপনার প্ল্যান বেছে নিন", "Free":"ফ্রি", "Premium":"প্রিমিয়াম", "Most Popular":"সবচেয়ে জনপ্রিয়", "Go Premium":"প্রিমিয়াম নিন", "Premium Plan Active":"প্রিমিয়াম প্ল্যান সক্রিয়", "Payment Methods":"পেমেন্ট পদ্ধতি", "Add":"যোগ করুন",
  "Appearance":"দেখার ধরন", "Switch between light and dark mode":"লাইট ও ডার্ক মোড বদলান", "Interface language":"ইন্টারফেস ভাষা", "Notifications":"নোটিফিকেশন", "Push Notifications":"পুশ নোটিফিকেশন", "General scan alerts":"সাধারণ স্ক্যান অ্যালার্ট", "Treatment Reminders":"চিকিৎসা রিমাইন্ডার", "Spray and treatment alerts":"স্প্রে ও চিকিৎসা অ্যালার্ট", "Watering Reminders":"পানি দেওয়ার রিমাইন্ডার", "Scheduled watering":"নির্ধারিত পানি দেওয়া", "Account":"অ্যাকাউন্ট", "Privacy & Data":"গোপনীয়তা ও ডেটা", "Control your data":"আপনার ডেটা নিয়ন্ত্রণ করুন", "Manage":"ম্যানেজ", "Sign Out":"সাইন আউট", "Sign out of your account":"আপনার অ্যাকাউন্ট থেকে সাইন আউট করুন",
  "Get professional advice from agricultural experts near you.":"আপনার কাছের কৃষি বিশেষজ্ঞদের কাছ থেকে পেশাদার পরামর্শ পান।", "Plant Pathologist":"উদ্ভিদ রোগ বিশেষজ্ঞ", "Agricultural Advisor":"কৃষি পরামর্শক", "Crop Protection Specialist":"ফসল সুরক্ষা বিশেষজ্ঞ", "Soil Scientist":"মাটি বিজ্ঞানী", "Available":"উপলব্ধ", "Busy":"ব্যস্ত", "Contact":"যোগাযোগ", "Emergency Crop Help":"জরুরি ফসল সহায়তা", "24/7 helpline for urgent crop crisis situations across Bangladesh.":"বাংলাদেশজুড়ে জরুরি ফসল সংকটে ২৪/৭ হেল্পলাইন।", "📞 Call Now":"📞 এখনই কল করুন",
  "Weather & Disease Risk":"আবহাওয়া ও রোগ ঝুঁকি", "Real-time weather-based disease risk for your crops.":"আপনার ফসলের জন্য রিয়েল-টাইম আবহাওয়া-ভিত্তিক রোগ ঝুঁকি।", "Use my location":"আমার লোকেশন ব্যবহার করুন", "Refresh":"রিফ্রেশ", "Live data":"লাইভ ডেটা", "Humidity":"আর্দ্রতা", "Wind":"বাতাস", "UV Index":"ইউভি ইনডেক্স", "Rainfall":"বৃষ্টিপাত", "Rain Chance":"বৃষ্টির সম্ভাবনা", "Disease Risk Today":"আজকের রোগ ঝুঁকি", "High":"উচ্চ", "Moderate":"মাঝারি", "Low":"কম",
  "Admin Dashboard":"অ্যাডমিন ড্যাশবোর্ড", "System overview, user management, and analytics.":"সিস্টেম ওভারভিউ, ব্যবহারকারী ব্যবস্থাপনা ও অ্যানালিটিক্স।", "Total Users":"মোট ব্যবহারকারী", "Premium Users":"প্রিমিয়াম ব্যবহারকারী", "Uptime":"আপটাইম", "Full admin panel including user management available in the backend dashboard.":"ব্যবহারকারী ব্যবস্থাপনাসহ পূর্ণ অ্যাডমিন প্যানেল backend dashboard-এ উপলব্ধ।",
  "Cancel":"বাতিল", "Capture Photo":"ছবি তুলুন", "Camera Capture":"ক্যামেরা ক্যাপচার", "Toggle theme":"থিম পরিবর্তন করুন"
};

const EXTRA_STATIC_BN = {
  "PhytoSentry was built to empower Bangladeshi farmers with cutting-edge AI — making expert-level plant disease diagnosis accessible to everyone, anywhere.": "PhytoSentry তৈরি করা হয়েছে বাংলাদেশের কৃষকদের ক্ষমতায়নের জন্য—যাতে আধুনিক এআই দিয়ে যেকোনো জায়গা থেকে বিশেষজ্ঞ-মানের উদ্ভিদ রোগ শনাক্তকরণ করা যায়।",
  "FARMERS SERVED": "সেবা পাওয়া কৃষক",
  "DISEASES DETECTED": "শনাক্ত রোগ",
  "ACCURACY RATE": "নির্ভুলতার হার",
  "DISTRICTS": "জেলা",
  "TECHNOLOGY STACK": "প্রযুক্তি স্ট্যাক",
  "Deep Learning": "ডিপ লার্নিং",
  "TensorFlow/Keras CNN trained on 120K+ leaf images": "১২০কে+ পাতার ছবিতে প্রশিক্ষিত TensorFlow/Keras CNN",
  "Secure Cloud": "নিরাপদ ক্লাউড",
  "End-to-end encryption, GDPR-compliant": "এন্ড-টু-এন্ড এনক্রিপশন, GDPR-সম্মত",
  "Real-time API": "রিয়েল-টাইম API",
  "Sub-3 second inference, 99% uptime": "৩ সেকেন্ডের কম সময়ে ফলাফল, ৯৯% আপটাইম",
  "Bilingual UI": "দ্বিভাষিক UI",
  "Full English and Bangla interface": "সম্পূর্ণ ইংরেজি ও বাংলা ইন্টারফেস",
  "Our mission, technology, and team.": "আমাদের লক্ষ্য, প্রযুক্তি ও টিম।",
  "Payments & Subscription": "পেমেন্ট ও সাবস্ক্রিপশন",
  "Manage your plan and payment methods.": "আপনার প্ল্যান ও পেমেন্ট পদ্ধতি পরিচালনা করুন।",
  "Basic disease info": "বেসিক রোগের তথ্য",
  "Email support": "ইমেইল সাপোর্ট",
  "Web access": "ওয়েব অ্যাক্সেস",
  "5 scans per day": "প্রতিদিন ৫টি স্ক্যান",
  "Unlimited scans": "আনলিমিটেড স্ক্যান",
  "PDF reports & history": "পিডিএফ রিপোর্ট ও ইতিহাস",
  "Expert advisory": "বিশেষজ্ঞ পরামর্শ",
  "Priority support": "প্রায়োরিটি সাপোর্ট",
  "Weather risk alerts": "আবহাওয়া ঝুঁকি অ্যালার্ট",
  "Bangla interface": "বাংলা ইন্টারফেস",
  "Renews July 5, 2026 · ৳99/month": "৫ জুলাই ২০২৬ নবায়ন হবে · ৳৯৯/মাস",
  "Bank Transfer": "ব্যাংক ট্রান্সফার",
  "Direct bank wire transfer": "সরাসরি ব্যাংক ওয়্যার ট্রান্সফার",
  "Cash Payment": "নগদ পেমেন্ট",
  "Cash on delivery / agent": "ক্যাশ অন ডেলিভারি / এজেন্ট",
  "International card payments": "আন্তর্জাতিক কার্ড পেমেন্ট",
  "Pay with bKash mobile banking": "বিকাশ মোবাইল ব্যাংকিং দিয়ে পেমেন্ট করুন",
  "Pay with Nagad digital wallet": "নগদ ডিজিটাল ওয়ালেট দিয়ে পেমেন্ট করুন",
  "Pay with Rocket mobile banking": "রকেট মোবাইল ব্যাংকিং দিয়ে পেমেন্ট করুন",
  "Profile": "প্রোফাইল",
  "Pricing": "মূল্য তালিকা",
  "Admin Dashboard": "অ্যাডমিন ড্যাশবোর্ড",
  "Stored Users": "সংরক্ষিত ব্যবহারকারী",
  "Live DB": "লাইভ ডিবি",
  "Real DB auth": "রিয়েল ডিবি অথ",
  "From DB/history": "ডিবি/ইতিহাস থেকে",
  "From history": "ইতিহাস থেকে",
  "Live data": "লাইভ ডেটা",
  "Cached data": "ক্যাশ ডেটা",
  "Calculated": "গণনা করা",
  "Loading live weather...": "লাইভ আবহাওয়া লোড হচ্ছে...",
  "Partly Cloudy": "আংশিক মেঘলা",
  "Your location": "আপনার লোকেশন",
  "Dhaka, Bangladesh": "ঢাকা, বাংলাদেশ",
  "Chattogram, Bangladesh": "চট্টগ্রাম, বাংলাদেশ",
  "Rajshahi, Bangladesh": "রাজশাহী, বাংলাদেশ",
  "Khulna, Bangladesh": "খুলনা, বাংলাদেশ",
  "Sylhet, Bangladesh": "সিলেট, বাংলাদেশ",
  "Barishal, Bangladesh": "বরিশাল, বাংলাদেশ",
  "Rangpur, Bangladesh": "রংপুর, বাংলাদেশ",
  "Mymensingh, Bangladesh": "ময়মনসিংহ, বাংলাদেশ",
  "Location permission denied. Showing Dhaka weather.": "লোকেশন অনুমতি দেওয়া হয়নি। ঢাকা আবহাওয়া দেখানো হচ্ছে।",
  "Geolocation is not supported by this browser.": "এই ব্রাউজারে জিওলোকেশন সাপোর্ট নেই।",
  "Weather API failed": "আবহাওয়া API ব্যর্থ হয়েছে",
  "Weather risk": "আবহাওয়া ঝুঁকি",
  "Weather Risk": "আবহাওয়া ঝুঁকি",
  "Reports": "রিপোর্ট",
  "Support": "সাপোর্ট",
  "Scan": "স্ক্যান",
  "Expert": "বিশেষজ্ঞ",
  "How to scan?": "কিভাবে স্ক্যান করব?",
  "PDF report": "পিডিএফ রিপোর্ট",
  "Login help": "লগইন সহায়তা",
  "Expert help": "বিশেষজ্ঞ সহায়তা",
  "Ask about scan, report, login...": "স্ক্যান, রিপোর্ট, লগইন নিয়ে জিজ্ঞাসা করুন...",
  "Typing...": "লিখছে...",
  "Close chatbot": "চ্যাটবট বন্ধ করুন",
  "PhytoSentry Assistant": "PhytoSentry সহকারী",
  "Hi! I can help with PhytoSentry leaf scan, reports, login, weather risk, treatment, payments, and expert support.": "হাই! আমি PhytoSentry পাতা স্ক্যান, রিপোর্ট, লগইন, আবহাওয়া ঝুঁকি, চিকিৎসা, পেমেন্ট ও বিশেষজ্ঞ সহায়তা নিয়ে সাহায্য করতে পারি।",
  "I could not reach the support API, but I can still help with basic PhytoSentry website guidance.": "সাপোর্ট API-তে পৌঁছানো যায়নি, তবে PhytoSentry ওয়েবসাইট ব্যবহারে আমি এখনও সাহায্য করতে পারি।",
  "I can help with PhytoSentry scan, report, login, weather, treatment, payment, and expert support.": "আমি PhytoSentry স্ক্যান, রিপোর্ট, লগইন, আবহাওয়া, চিকিৎসা, পেমেন্ট ও বিশেষজ্ঞ সহায়তায় সাহায্য করতে পারি।",
  "Go to Scan Leaf, select crop, upload/capture a clear leaf photo, then press Analyze Leaf. Use daylight and clear focus.": "Scan Leaf পেজে যান, ফসল নির্বাচন করুন, পরিষ্কার পাতার ছবি আপলোড/ক্যাপচার করুন, তারপর Analyze Leaf চাপুন। দিনের আলো ও পরিষ্কার ফোকাস ব্যবহার করুন।",
  "From Treatment or History, use PDF BN/Print BN for Bangla reports and PDF EN/Print EN for English reports.": "Treatment বা History থেকে বাংলা রিপোর্টের জন্য PDF BN/Print BN এবং ইংরেজি রিপোর্টের জন্য PDF EN/Print EN ব্যবহার করুন।",
  "The Weather page shows disease risk using live weather data. If the API fails, cached data is shown.": "Weather পেজ লাইভ আবহাওয়া ডেটা দিয়ে রোগ ঝুঁকি দেখায়। API ব্যর্থ হলে ক্যাশ ডেটা দেখানো হয়।",
  "Use Expert Connect for agricultural expert help. Use the hotline for urgent crop issues.": "কৃষি বিশেষজ্ঞ সহায়তার জন্য Expert Connect ব্যবহার করুন। জরুরি ফসল সমস্যায় হটলাইন ব্যবহার করুন।",
  "Create an account with Sign Up, then Sign In. Use Forgot Password if you need a reset token.": "Sign Up দিয়ে অ্যাকাউন্ট তৈরি করুন, তারপর Sign In করুন। রিসেট টোকেন দরকার হলে Forgot Password ব্যবহার করুন।",
  "Create Free Account": "বিনামূল্যে অ্যাকাউন্ট তৈরি করুন",
  "Email or phone sign in": "ইমেইল বা ফোন দিয়ে সাইন ইন",
  "Email or Phone Number": "ইমেইল বা ফোন নম্বর",
  "Email Address (optional if phone used)": "ইমেইল ঠিকানা (ফোন দিলে ঐচ্ছিক)",
  "Phone Number (optional if email used)": "ফোন নম্বর (ইমেইল দিলে ঐচ্ছিক)",
  "Send Reset Code": "রিসেট কোড পাঠান",
  "Enter OTP/code": "OTP/কোড লিখুন",
  "Verification code sent/queued.": "যাচাইকরণ কোড পাঠানো/কিউ করা হয়েছে।",
  "OTP/code verification ready": "OTP/কোড যাচাইকরণের জন্য প্রস্তুত",
  "Verified successfully.": "সফলভাবে যাচাই হয়েছে।",
  "Verification failed.": "যাচাইকরণ ব্যর্থ হয়েছে।",
  "Could not send verification code.": "যাচাইকরণ কোড পাঠানো যায়নি।",
  "Invalid verification code.": "ভুল যাচাইকরণ কোড।",
  "Authentication failed.": "অথেনটিকেশন ব্যর্থ হয়েছে।",
  "Done.": "সম্পন্ন।",
  "Image selected successfully.": "ছবি সফলভাবে নির্বাচন করা হয়েছে।",
  "Camera access denied. Please allow camera or use file upload.": "ক্যামেরা অনুমতি দেওয়া হয়নি। ক্যামেরা অনুমতি দিন অথবা ফাইল আপলোড ব্যবহার করুন।",
  "Real AI prediction failed": "রিয়েল এআই পূর্বাভাস ব্যর্থ হয়েছে",
  "Please make sure the backend is running on port 8000, then scan again.": "Backend port 8000-এ চলছে কি না নিশ্চিত করে আবার স্ক্যান করুন।",
  "Auto Detect": "অটো শনাক্ত",
  "Tomato": "টমেটো",
  "Potato": "আলু",
  "Squash": "স্কোয়াশ",
  "Bell Pepper / Chili": "ক্যাপসিকাম / মরিচ",
  "Corn": "ভুট্টা",
  "Apple": "আপেল",
  "Orange": "কমলা",
  "Grape": "আঙ্গুর",
  "Strawberry": "স্ট্রবেরি",
  "Cherry": "চেরি",
  "Healthy Leaf": "সুস্থ পাতা",
  "Early Blight": "আর্লি ব্লাইট",
  "Late Blight": "লেট ব্লাইট",
  "Black Rot": "ব্ল্যাক রট",
  "Bacterial Spot": "ব্যাকটেরিয়াল স্পট",
  "Powdery Mildew": "পাউডারি মিলডিউ",
  "Septoria Leaf Spot": "সেপ্টোরিয়া লিফ স্পট",
  "Leaf Blight Risk": "লিফ ব্লাইট ঝুঁকি",
  "Needs attention": "মনোযোগ প্রয়োজন",
  "High Severity": "উচ্চ তীব্রতা",
  "Moderate severity": "মাঝারি তীব্রতা",
  "Avg. Confidence": "গড় আস্থা",
  "Scans Processed": "প্রসেস করা স্ক্যান",
  "Plant Diseases": "উদ্ভিদ রোগ",
  "Detection Accuracy": "শনাক্তকরণ নির্ভুলতা",
  "Tomato Farmer, Sylhet": "টমেটো কৃষক, সিলেট",
  "Grape Farmer, Rajshahi": "আঙ্গুর কৃষক, রাজশাহী",
  "Vegetable Grower, Dhaka": "সবজি চাষী, ঢাকা",
  "PhytoSentry detected early blight before it spread. Saved 40% of my yield!": "PhytoSentry রোগ ছড়ানোর আগেই আর্লি ব্লাইট শনাক্ত করেছে। আমার ৪০% ফলন বাঁচিয়েছে!",
  "Got treatment advice within seconds. Incredible accuracy. Highly recommend.": "কয়েক সেকেন্ডেই চিকিৎসা পরামর্শ পেয়েছি। অসাধারণ নির্ভুলতা। খুবই সুপারিশযোগ্য।",
  "The weather risk feature warned me 2 days before powdery mildew appeared.": "পাউডারি মিলডিউ দেখা দেওয়ার ২ দিন আগে আবহাওয়া ঝুঁকি ফিচার আমাকে সতর্ক করেছে।",
  "Payment Methods": "পেমেন্ট পদ্ধতি",
  "Choose Your Plan": "আপনার প্ল্যান বেছে নিন",
  "Free": "ফ্রি",
  "Premium": "প্রিমিয়াম",
  "Most Popular": "সবচেয়ে জনপ্রিয়",
  "Go Premium": "প্রিমিয়াম নিন",
  "Premium Plan Active": "প্রিমিয়াম প্ল্যান সক্রিয়",
  "Edit Profile": "প্রোফাইল সম্পাদনা",
  "Available": "উপলব্ধ",
  "Busy": "ব্যস্ত",
  "Contact": "যোগাযোগ",
  "Dr. Fabiha Islam": "ড. ফাবিহা ইসলাম",
  "Dr. Fariha Islam": "ড. ফারিহা ইসলাম",
  "Mohammad Hasan": "মোহাম্মদ হাসান",
  "Asma Begum": "আসমা বেগম",
  "Abdul Karim": "আব্দুল করিম",
  "Rahim Molla": "রহিম মোল্লা",
  "Farida Begum": "ফরিদা বেগম",
  "Rahim Farmer": "রহিম কৃষক",
  "Plant Pathologist": "উদ্ভিদ রোগ বিশেষজ্ঞ",
  "Agricultural Advisor": "কৃষি পরামর্শক",
  "Crop Protection Specialist": "ফসল সুরক্ষা বিশেষজ্ঞ",
  "Soil Scientist": "মাটি বিজ্ঞানী",
  "24/7 website support": "২৪/৭ ওয়েবসাইট সাপোর্ট",
  "Backend": "ব্যাকএন্ড",
  "Frontend": "ফ্রন্টএন্ড",
  "Frontend build successful": "ফ্রন্টএন্ড বিল্ড সফল",
  "Project": "প্রজেক্ট",
  "Company": "কোম্পানি",
  "PRODUCT": "প্রোডাক্ট",
  "COMPANY": "কোম্পানি",
  "SUPPORT": "সাপোর্ট",
  "Made for Bangladeshi farmers": "বাংলাদেশি কৃষকদের জন্য তৈরি",
  "All rights reserved": "সর্বস্বত্ব সংরক্ষিত",
  "or click to browse files": "অথবা ফাইল ব্রাউজ করতে ক্লিক করুন"
};
Object.assign(STATIC_BN, EXTRA_STATIC_BN);
const STATIC_EN = Object.fromEntries(Object.entries(STATIC_BN).map(([en,bn]) => [bn,en]));
function translateStaticUI(lang){
  const map = lang === "bn" ? STATIC_BN : STATIC_EN;
  const skip = new Set(["SCRIPT","STYLE","NOSCRIPT","SVG","INPUT","TEXTAREA"]);
  const entries = Object.entries(map).filter(([a,b])=>a && b && a !== b).sort((a,b)=>b[0].length-a[0].length);
  function translateValue(value){
    if(!value) return value;
    const raw = String(value);
    const trimmed = raw.trim();
    if(!trimmed) return value;
    if(map[trimmed]) return raw.replace(trimmed, map[trimmed]);
    let out = raw;
    for(const [from,to] of entries){
      if(from.length < 3) continue;
      if(out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      const parent = node.parentElement;
      if(!parent || skip.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if(parent.closest && parent.closest('[data-no-translate="true"]')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const next = translateValue(node.nodeValue);
    if(next !== node.nodeValue) node.nodeValue = next;
  });
  document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(el=>{
    ["placeholder","title","aria-label"].forEach(attr=>{
      const v=el.getAttribute(attr);
      const next=translateValue(v);
      if(v && next !== v) el.setAttribute(attr,next);
    });
  });
}


// Report translation helpers: Bangla report should not fall back to English AI text.
const REPORT_PLANT_BN = {Apple:"আপেল",Blueberry:"ব্লুবেরি",Cherry:"চেরি",Corn:"ভুট্টা",Grape:"আঙ্গুর",Orange:"কমলা",Peach:"পিচ",Potato:"আলু",Raspberry:"রাস্পবেরি",Soybean:"সয়াবিন",Squash:"স্কোয়াশ",Strawberry:"স্ট্রবেরি",Tomato:"টমেটো",Plant:"উদ্ভিদ","Pepper, bell":"ক্যাপসিকাম","Pepper bell":"ক্যাপসিকাম"};
const REPORT_DISEASE_BN = {"Healthy Leaf":"সুস্থ পাতা",healthy:"সুস্থ","Apple scab":"আপেল স্ক্যাব","Black rot":"ব্ল্যাক রট","Cedar apple rust":"সিডার আপেল রাস্ট","Powdery mildew":"পাউডারি মিলডিউ","Cercospora leaf spot Gray leaf spot":"সারকোস্পোরা/গ্রে লিফ স্পট","Common rust":"কমন রাস্ট","Northern Leaf Blight":"নর্দার্ন লিফ ব্লাইট","Esca (Black Measles)":"এসকা/ব্ল্যাক মিজলস","Leaf blight (Isariopsis Leaf Spot)":"লিফ ব্লাইট/আইসারিওপসিস লিফ স্পট","Haunglongbing (Citrus greening)":"সাইট্রাস গ্রিনিং/হুয়াংলংবিং","Bacterial spot":"ব্যাকটেরিয়াল স্পট","Early blight":"আর্লি ব্লাইট","Late blight":"লেট ব্লাইট","Leaf Mold":"লিফ মোল্ড","Septoria leaf spot":"সেপ্টোরিয়া লিফ স্পট","Spider mites Two-spotted spider mite":"টু-স্পটেড স্পাইডার মাইট","Target Spot":"টার্গেট স্পট","Tomato Yellow Leaf Curl Virus":"টমেটো ইয়েলো লিফ কার্ল ভাইরাস","Tomato mosaic virus":"টমেটো মোজাইক ভাইরাস","Leaf scorch":"লিফ স্কর্চ","No pathogen detected":"কোনো রোগজীবাণু শনাক্ত হয়নি","Plant pathogen / field confirmation recommended":"উদ্ভিদ রোগজীবাণু / মাঠ পর্যায়ে নিশ্চিতকরণ প্রস্তাবিত"};
const REPORT_VALUE_BN = {High:"উচ্চ",Moderate:"মাঝারি",Low:"কম",None:"নেই",Healthy:"সুস্থ",Developing:"বিকাশমান","Early to developing":"প্রাথমিক থেকে বিকাশমান","Possible early stage":"সম্ভাব্য প্রাথমিক পর্যায়",Organic:"জৈব",Biological:"জীবাণুভিত্তিক",Chemical:"রাসায়নিক"};
const REPORT_TREATMENT_BN = {"Neem Oil Spray":"নিম তেল স্প্রে","Preventive Neem Spray":"প্রতিরোধমূলক নিম স্প্রে","Trichoderma Viride":"ট্রাইকোডার্মা ভিরিডি","Trichoderma / Bacillus Bio-control":"ট্রাইকোডার্মা / ব্যাসিলাস বায়ো-কন্ট্রোল","Copper Oxychloride":"কপার অক্সিক্লোরাইড","Copper / Mancozeb Fungicide":"কপার / ম্যানকোজেব ছত্রাকনাশক","Beneficial Microbes":"উপকারী অণুজীব","No Chemical Needed":"রাসায়নিক প্রয়োজন নেই","Vector Control":"বাহক পোকা নিয়ন্ত্রণ","Remove Infected Plants":"আক্রান্ত গাছ অপসারণ","Insect Vector Management":"বাহক পোকা ব্যবস্থাপনা","Sanitation + Neem":"পরিচ্ছন্নতা + নিম","Bacillus-based Bio-control":"ব্যাসিলাস-ভিত্তিক বায়ো-কন্ট্রোল","Copper-based Bactericide":"কপার-ভিত্তিক ব্যাকটেরিয়ানাশক"};
const REPORT_DOSE_BN = {"Mix 5ml neem oil in 1L water. Spray every 7 days in early morning.":"১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে ভোরে/সকালে প্রতি ৭ দিনে স্প্রে করুন।","Mix 5 ml neem oil in 1 liter water and spray every 7 days in early morning.":"১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে ভোরে/সকালে প্রতি ৭ দিনে স্প্রে করুন।","Mix 5 ml neem oil in 1 liter water and spray every 7 days.":"১ লিটার পানিতে ৫ মিলি নিম তেল মিশিয়ে প্রতি ৭ দিনে সকালে স্প্রে করুন।","Apply to soil around plant base to reduce pathogen growth.":"রোগজীবাণুর বৃদ্ধি কমাতে গাছের গোড়ার মাটিতে প্রয়োগ করুন।","Apply recommended bio-control product to soil or foliage as label directs.":"লেবেল নির্দেশনা অনুযায়ী মাটি বা পাতায় অনুমোদিত বায়ো-কন্ট্রোল পণ্য প্রয়োগ করুন।","Use 2g per liter of water. Apply every 10-14 days. Avoid overuse.":"প্রতি লিটার পানিতে ২ গ্রাম ব্যবহার করুন। ১০–১৪ দিন পরপর প্রয়োগ করুন এবং অতিরিক্ত ব্যবহার এড়িয়ে চলুন।","Use approved fungicide as per local label instructions. Avoid overuse.":"স্থানীয় লেবেল নির্দেশনা অনুযায়ী অনুমোদিত ছত্রাকনাশক ব্যবহার করুন। অতিরিক্ত ব্যবহার এড়িয়ে চলুন।","Use mild neem spray only when pest pressure is visible. Avoid unnecessary spraying.":"শুধু পোকামাকড়ের চাপ দেখা গেলে হালকা নিম স্প্রে ব্যবহার করুন। অপ্রয়োজনীয় স্প্রে এড়িয়ে চলুন।","Apply compost or biofertilizer to maintain strong plant immunity.":"গাছের রোগ প্রতিরোধ ক্ষমতা বজায় রাখতে কম্পোস্ট বা বায়োফার্টিলাইজার ব্যবহার করুন।","No chemical treatment is recommended for a healthy leaf.":"সুস্থ পাতার জন্য কোনো রাসায়নিক চিকিৎসা সুপারিশ করা হয় না।","Use yellow sticky traps and neem-based sprays to reduce whiteflies/aphids.":"সাদা মাছি/এফিড কমাতে হলুদ স্টিকি ট্র্যাপ ও নিম-ভিত্তিক স্প্রে ব্যবহার করুন।","Remove severely infected plants and control insect vectors immediately.":"গুরুতর আক্রান্ত গাছ সরিয়ে ফেলুন এবং বাহক পোকা দ্রুত নিয়ন্ত্রণ করুন।","Use recommended insecticides only under local agricultural expert guidance.":"শুধু স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শে অনুমোদিত কীটনাশক ব্যবহার করুন।","Remove infected leaves and use neem spray as a preventive support.":"আক্রান্ত পাতা সরিয়ে ফেলুন এবং প্রতিরোধমূলক সহায়তা হিসেবে নিম স্প্রে ব্যবহার করুন।","Apply Bacillus subtilis products according to label instructions.":"লেবেল নির্দেশনা অনুযায়ী Bacillus subtilis পণ্য প্রয়োগ করুন।","Use copper formulation only as directed by the product label.":"পণ্যের লেবেল নির্দেশনা অনুযায়ী কপার ফর্মুলেশন ব্যবহার করুন।"};
const REPORT_SYMPTOM_BN = {"Brown circular spots with dark concentric rings":"গাঢ় বৃত্তসহ বাদামি গোলাকার দাগ","Yellowing (chlorosis) around infected areas":"আক্রান্ত অংশের চারপাশে হলদে ভাব","Lower leaves affected first":"প্রথমে নিচের পাতাগুলো আক্রান্ত হয়","Premature leaf drop":"পাতা আগেভাগে ঝরে পড়া","Brown or dark leaf lesions":"পাতায় বাদামি বা কালচে ক্ষত/দাগ","Yellowing around affected areas":"আক্রান্ত অংশের চারপাশে হলদে ভাব","Spots may expand under humid conditions":"আর্দ্র পরিবেশে দাগ বড় হতে পারে","Older leaves may dry or fall early":"পুরোনো পাতা শুকিয়ে আগেভাগে ঝরে যেতে পারে","Small rust-colored pustules on leaves":"পাতায় মরিচা রঙের ছোট দানা/পুস্টিউল দেখা যায়","Yellow flecks around infection sites":"সংক্রমিত স্থানের চারপাশে হলুদ দাগ দেখা যায়","Disease spreads faster in humid weather":"আর্দ্র আবহাওয়ায় রোগ দ্রুত ছড়ায়","Severe cases reduce photosynthesis":"গুরুতর অবস্থায় সালোকসংশ্লেষণ কমে যায়","White or gray powdery fungal growth":"পাতায় সাদা বা ধূসর গুঁড়ার মতো ছত্রাক দেখা যায়","Leaf curling or distortion":"পাতা কুঁকড়ে যায় বা বিকৃত হয়","Reduced plant vigor":"গাছের স্বাভাবিক বৃদ্ধি ও শক্তি কমে যায়","Spread increases in warm humid conditions":"উষ্ণ ও আর্দ্র পরিবেশে ছড়ানোর ঝুঁকি বাড়ে","Circular or irregular spots on leaf surface":"পাতার উপর গোলাকার বা অনিয়মিত দাগ দেখা যায়","Dark margins around lesions":"দাগের চারপাশে গাঢ় কিনারা দেখা যায়","Yellowing near infected tissues":"আক্রান্ত টিস্যুর কাছে হলদে ভাব দেখা যায়","Leaf quality and growth may decline":"পাতার মান ও বৃদ্ধি কমে যেতে পারে","Mosaic or mottled leaf pattern":"পাতায় মোজাইক বা ছোপ ছোপ দাগ দেখা যায়","Leaf curling or deformation":"পাতা কুঁকড়ে যায় বা বিকৃত হয়","Stunted plant growth":"গাছের বৃদ্ধি বাধাগ্রস্ত হয়","Infected plants may show uneven yellowing":"আক্রান্ত গাছে অসম হলদে ভাব দেখা যেতে পারে","Visible abnormal leaf pattern":"পাতায় অস্বাভাবিক প্যাটার্ন দেখা যায়","Discoloration or lesions on leaf":"পাতায় রঙ পরিবর্তন বা ক্ষত দেখা যায়","Possible reduction in plant vigor":"গাছের স্বাভাবিক শক্তি কমে যেতে পারে","Monitor nearby plants for spread":"রোগ ছড়াচ্ছে কি না দেখতে পাশের গাছগুলো পর্যবেক্ষণ করুন","Leaf color and surface pattern appear normal":"পাতার রঙ ও পৃষ্ঠের প্যাটার্ন স্বাভাবিক দেখাচ্ছে","No strong disease-specific visual marks detected":"রোগ-নির্দিষ্ট শক্তিশালী দৃশ্যমান লক্ষণ পাওয়া যায়নি","Continue checking for future spots, curling, or discoloration":"ভবিষ্যতে দাগ, কুঁকড়ে যাওয়া বা রঙ পরিবর্তন হচ্ছে কি না নিয়মিত দেখুন","Maintain balanced watering and sunlight":"সুষম পানি ও পর্যাপ্ত আলো বজায় রাখুন"};
const REPORT_PREVENTION_BN = {"Inspect leaves regularly and remove infected plant parts early":"নিয়মিত পাতা পরীক্ষা করুন এবং আক্রান্ত অংশ দ্রুত সরিয়ে ফেলুন","Keep proper plant spacing for airflow":"বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন","Water at the base in the morning; avoid wetting leaves at night":"সকালে গাছের গোড়ায় পানি দিন; রাতে পাতা ভেজানো এড়িয়ে চলুন","Use clean tools and disease-free seeds/seedlings":"পরিষ্কার যন্ত্রপাতি ও রোগমুক্ত বীজ/চারা ব্যবহার করুন","Rotate crops and remove crop residues after harvest":"ফসল রোটেশন করুন এবং ফসল কাটার পর অবশিষ্টাংশ সরিয়ে ফেলুন","Remove and destroy infected leaves immediately":"আক্রান্ত পাতা দ্রুত সরিয়ে ধ্বংস করুন","Ensure proper spacing for air circulation":"বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন","Water at plant base in the morning only":"শুধু সকালে গাছের গোড়ায় পানি দিন","Use certified disease-free seeds":"সনদপ্রাপ্ত রোগমুক্ত বীজ ব্যবহার করুন","Rotate crops every season":"প্রতি মৌসুমে ফসল রোটেশন করুন","Continue regular monitoring even though the leaf appears healthy":"পাতা সুস্থ দেখালেও নিয়মিত পর্যবেক্ষণ চালিয়ে যান","Maintain balanced watering and avoid waterlogging":"সুষম পানি দিন এবং জলাবদ্ধতা এড়িয়ে চলুন","Keep good airflow around the plant":"গাছের চারপাশে ভালো বাতাস চলাচল রাখুন","Use preventive organic care only when needed":"প্রয়োজন হলে তবেই প্রতিরোধমূলক জৈব যত্ন নিন","Check nearby plants for early symptoms weekly":"প্রতি সপ্তাহে পাশের গাছে প্রাথমিক লক্ষণ আছে কি না দেখুন"};
function lookupBn(map,v){const s=String(v||""); if(Object.prototype.hasOwnProperty.call(map,s)) return map[s]; const sl=s.toLowerCase().trim(); const k=Object.keys(map).find(x=>x.toLowerCase().trim()===sl); return k?map[k]:undefined}
function hasLatin(v){return /[A-Za-z]/.test(String(v||""))}
function bnPlant(v){return lookupBn(REPORT_PLANT_BN,v) || String(v||"")}
function bnDisease(v){const s=String(v||"").replace("—","–"); if(s.includes("–")){const [plant,...rest]=s.split("–"); const disease=rest.join("–").trim(); return `${bnPlant(plant.trim())} – ${lookupBn(REPORT_DISEASE_BN,disease)||disease}`} return lookupBn(REPORT_DISEASE_BN,s) || s}
function bnSymptomsForDisease(disease,severity){const d=String(disease||"").toLowerCase(); if(String(severity||"").toLowerCase()==="none"||d.includes("healthy")) return ["পাতার রঙ ও পৃষ্ঠের প্যাটার্ন স্বাভাবিক দেখাচ্ছে","রোগ-নির্দিষ্ট শক্তিশালী দৃশ্যমান লক্ষণ পাওয়া যায়নি","ভবিষ্যতে দাগ, কুঁকড়ে যাওয়া বা রঙ পরিবর্তন হচ্ছে কি না নিয়মিত দেখুন","সুষম পানি ও পর্যাপ্ত আলো বজায় রাখুন"]; if(d.includes("virus")||d.includes("mosaic")||d.includes("curl")) return ["পাতায় মোজাইক বা ছোপ ছোপ দাগ দেখা যায়","পাতা কুঁকড়ে যায় বা বিকৃত হয়","গাছের বৃদ্ধি বাধাগ্রস্ত হতে পারে","আক্রান্ত গাছে অসম হলদে ভাব দেখা যেতে পারে"]; if(d.includes("mildew")) return ["পাতায় সাদা বা ধূসর গুঁড়ার মতো ছত্রাক দেখা যায়","পাতা কুঁকড়ে যেতে পারে","গাছের স্বাভাবিক বৃদ্ধি কমে যায়","উষ্ণ ও আর্দ্র পরিবেশে ছড়ানোর ঝুঁকি বাড়ে"]; if(d.includes("rust")) return ["পাতায় মরিচা রঙের ছোট দানা দেখা যায়","সংক্রমিত স্থানের চারপাশে হলুদ দাগ দেখা যায়","আর্দ্র আবহাওয়ায় রোগ দ্রুত ছড়ায়","গুরুতর অবস্থায় পাতার কার্যকারিতা কমে যায়"]; if(d.includes("blight")) return ["পাতায় বাদামি বা কালচে ক্ষত/দাগ দেখা যায়","আক্রান্ত অংশের চারপাশে হলদে ভাব থাকে","আর্দ্র পরিবেশে দাগ দ্রুত বড় হতে পারে","পুরোনো পাতা শুকিয়ে আগেভাগে ঝরে যেতে পারে"]; if(d.includes("spot")||d.includes("scab")||d.includes("scorch")) return ["পাতার উপর গোলাকার বা অনিয়মিত দাগ দেখা যায়","দাগের চারপাশে গাঢ় কিনারা থাকতে পারে","আক্রান্ত অংশের কাছে হলদে ভাব দেখা যায়","পাতার মান ও বৃদ্ধি কমে যেতে পারে"]; return ["পাতায় অস্বাভাবিক দাগ বা প্যাটার্ন দেখা যায়","পাতায় রঙ পরিবর্তন বা ক্ষত দেখা যেতে পারে","গাছের স্বাভাবিক শক্তি কমে যেতে পারে","রোগ ছড়াচ্ছে কি না দেখতে পাশের গাছগুলো পর্যবেক্ষণ করুন"]}
function bnDose(type,dose,disease){const foundDose=lookupBn(REPORT_DOSE_BN,dose); if(foundDose) return foundDose; const t=String(type||"").toLowerCase(), d=String(disease||"").toLowerCase(); if(t.includes("organic")) return "আক্রান্ত অংশ সরিয়ে ফেলুন এবং প্রয়োজন হলে সকালে অনুমোদিত জৈব/নিম-ভিত্তিক স্প্রে ব্যবহার করুন।"; if(t.includes("biological")) return "লেবেল নির্দেশনা অনুযায়ী অনুমোদিত বায়ো-কন্ট্রোল পণ্য ব্যবহার করুন এবং মাটির স্বাস্থ্য বজায় রাখুন।"; if(t.includes("chemical")) return d.includes("virus") ? "রাসায়নিক চিকিৎসার আগে স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নিন এবং বাহক পোকা নিয়ন্ত্রণ করুন।" : "স্থানীয় কৃষি বিশেষজ্ঞ/পণ্য লেবেল অনুযায়ী অনুমোদিত রাসায়নিক ব্যবহার করুন। অতিরিক্ত ব্যবহার এড়িয়ে চলুন।"; return "চিকিৎসা প্রয়োগের আগে স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নিন।"}
function bnReportResult(result){const plant=bnPlant(result.plant||"Plant"); const disease=bnDisease(result.disease||""); const sev=lookupBn(REPORT_VALUE_BN,result.severity)||result.severity||""; const healthy=String(result.severity||"").toLowerCase()==="none"||String(result.disease||"").toLowerCase().includes("healthy"); let symptoms=(result.symptoms||[]).map(s=>lookupBn(REPORT_SYMPTOM_BN,s)||s).filter(s=>!hasLatin(s)); if(!symptoms.length) symptoms=bnSymptomsForDisease(result.disease,result.severity); let prevention=(result.prevention||[]).map(p=>lookupBn(REPORT_PREVENTION_BN,p)||p).filter(p=>!hasLatin(p)); if(!prevention.length) prevention=["নিয়মিত পাতা পরীক্ষা করুন এবং আক্রান্ত অংশ দ্রুত সরিয়ে ফেলুন","বাতাস চলাচলের জন্য গাছের মাঝে যথেষ্ট দূরত্ব রাখুন","সকালে গাছের গোড়ায় পানি দিন; রাতে পাতা ভেজানো এড়িয়ে চলুন","পরিষ্কার যন্ত্রপাতি ও রোগমুক্ত বীজ/চারা ব্যবহার করুন","ফসল রোটেশন করুন এবং ফসল কাটার পর অবশিষ্টাংশ সরিয়ে ফেলুন"]; return {...result,plant,disease,scientific:lookupBn(REPORT_DISEASE_BN,result.scientific)||result.scientific,severity:sev,stage:lookupBn(REPORT_VALUE_BN,result.stage)||result.stage,overview:healthy?`আপলোড করা ${plant} পাতাটি সুস্থ মনে হচ্ছে। এআই মডেল কোনো শক্তিশালী রোগের লক্ষণ শনাক্ত করেনি। নিয়মিত পর্যবেক্ষণ ও প্রতিরোধমূলক যত্ন চালিয়ে যান।`:`PhytoSentry এআই মডেল ${plant} পাতায় ${disease} শনাক্ত করেছে। আস্থার স্কোর ${result.confidence}% এবং তীব্রতা ${sev}। রাসায়নিক চিকিৎসার আগে মাঠ পর্যায়ে নিশ্চিতকরণ ও স্থানীয় কৃষি বিশেষজ্ঞের পরামর্শ নেওয়া উত্তম।`,symptoms,prevention,treatments:(result.treatments||[]).map(tr=>({...tr,type:lookupBn(REPORT_VALUE_BN,tr.type)||tr.type,name:hasLatin(lookupBn(REPORT_TREATMENT_BN,tr.name)||tr.name)?"প্রস্তাবিত চিকিৎসা":(lookupBn(REPORT_TREATMENT_BN,tr.name)||tr.name),dose:bnDose(tr.type,tr.dose,result.disease)}))}}
function buildReportHTML(result,reportLang="en"){
  const bn=reportLang==="bn"; const r=bn?bnReportResult(result):result;
  const labels=bn?{title:"🌿 PhytoSentry উদ্ভিদ রোগ রিপোর্ট",date:"তারিখ",plant:"ফসল/উদ্ভিদ",disease:"রোগ",scientific:"বৈজ্ঞানিক নাম",confidence:"আস্থার স্কোর",severity:"তীব্রতা",affected:"আক্রান্ত অংশ",stage:"অবস্থা",details:"রোগের বিস্তারিত",symptoms:"লক্ষণ",treatments:"চিকিৎসা",prevention:"প্রতিরোধ"}:{title:"🌿 PhytoSentry Plant Disease Report",date:"Date",plant:"Plant",disease:"Disease",scientific:"Scientific Name",confidence:"Confidence",severity:"Severity",affected:"Affected Area",stage:"Stage",details:"Disease Details",symptoms:"Symptoms",treatments:"Treatments",prevention:"Prevention Tips"};
  const esc=v=>String(v??"").replace(/[&<>\"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[ch]));
  const html=`<h1>${labels.title}</h1><div class="box"><p><b>${labels.date}:</b> ${esc(r.date)}</p><p><b>${labels.plant}:</b> ${esc(r.plant)}</p><p><b>${labels.disease}:</b> ${esc(r.disease)}</p><p><b>${labels.scientific}:</b> ${esc(r.scientific)}</p><p><b>${labels.confidence}:</b> ${esc(r.confidence)}%</p><p><b>${labels.severity}:</b> ${esc(r.severity)}</p><p><b>${labels.affected}:</b> ${esc(r.affected_area)}</p><p><b>${labels.stage}:</b> ${esc(r.stage)}</p></div><div class="box"><h2>${labels.details}</h2><p>${esc(r.overview)}</p></div><div class="box"><h2>${labels.symptoms}</h2><ul>${(r.symptoms||[]).map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div><div class="box"><h2>${labels.treatments}</h2><ul>${(r.treatments||[]).map(tr=>`<li><b>${esc(tr.type)} – ${esc(tr.name)}:</b> ${esc(tr.dose)}</li>`).join("")}</ul></div><div class="box"><h2>${labels.prevention}</h2><ul>${(r.prevention||[]).map(t=>`<li>${esc(t)}</li>`).join("")}</ul></div>`;
  return {bn,html};
}

const cropTypes = [
  {id:"auto",name:"Auto Detect",icon:"🔍"},
  {id:"tomato",name:"Tomato",icon:"🍅"},
  {id:"potato",name:"Potato",icon:"🥔"},
  {id:"squash",name:"Squash",icon:"🎃"},
  {id:"chili",name:"Bell Pepper / Chili",icon:"🌶️"},
  {id:"corn",name:"Corn",icon:"🌽"},
  {id:"apple",name:"Apple",icon:"🍎"},
  {id:"orange",name:"Orange",icon:"🍊"},
  {id:"grape",name:"Grape",icon:"🍇"},
  {id:"strawberry",name:"Strawberry",icon:"🍓"},
  {id:"cherry",name:"Cherry",icon:"🍒"}
];

const defaultUser = {name:"Rahim Farmer",email:"rahim@phytosentry.ai",phone:"+880 1712345678",verified:true,created_at:"January 2024",plan:"premium",scans:128,saved:36};

const defaultResult = {
  id:"demo",plant:"Tomato",organ:"Leaf",disease:"Tomato – Early Blight",
  scientific:"Alternaria solani",confidence:93.6,severity:"Moderate",
  affected_area:"32%",stage:"Developing",date:"May 5, 2025 10:45 AM",image:"",
  overview:"Early blight is a common fungal disease affecting tomato leaves. It begins on older lower leaves and spreads rapidly in warm, humid weather conditions.",
  top3:[
    {disease:"Early Blight",scientific:"Alternaria solani",confidence:93.6},
    {disease:"Septoria Leaf Spot",scientific:"Septoria lycopersici",confidence:4.1},
    {disease:"Healthy Leaf",scientific:"No pathogen detected",confidence:2.3}
  ],
  symptoms:["Brown circular spots with dark concentric rings","Yellowing (chlorosis) around infected areas","Lower leaves affected first","Premature leaf drop"],
  treatments:[
    {type:"Organic",name:"Neem Oil Spray",dose:"Mix 5ml neem oil in 1L water. Spray every 7 days in early morning.",effectiveness:72},
    {type:"Biological",name:"Trichoderma Viride",dose:"Apply to soil around plant base to reduce pathogen growth.",effectiveness:81},
    {type:"Chemical",name:"Copper Oxychloride",dose:"Use 2g per liter of water. Apply every 10-14 days. Avoid overuse.",effectiveness:94}
  ],
  prevention:["Remove and destroy infected leaves immediately","Ensure proper spacing for air circulation","Water at plant base in the morning only","Use certified disease-free seeds","Rotate crops every season"]
};

const historyData = [
  {id:"h1",plant:"Tomato",disease:"Early Blight",confidence:93.6,severity:"Moderate",date:"May 5, 2025",severityLevel:"moderate"},
  {id:"h2",plant:"Grape",disease:"Black Rot",confidence:88.2,severity:"High",date:"May 3, 2025",severityLevel:"high"},
  {id:"h3",plant:"Potato",disease:"Late Blight",confidence:96.1,severity:"High",date:"Apr 30, 2025",severityLevel:"high"},
  {id:"h4",plant:"Corn",disease:"Healthy Leaf",confidence:99.1,severity:"None",date:"Apr 28, 2025",severityLevel:"low"},
  {id:"h5",plant:"Squash",disease:"Powdery Mildew",confidence:79.4,severity:"Low",date:"Apr 25, 2025",severityLevel:"low"},
];

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const initialResetToken = new URLSearchParams(window.location.search).get("reset_token");
  const [page,setPage]=useState(initialResetToken?"auth":"home");
  const [authMode,setAuthMode]=useState(initialResetToken?"reset":"signin");
  const [user,setUser]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("ps_user")||"null");}
    catch{return null;}
  });
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState("");
  const [result,setResult]=useState(defaultResult);
  const [items,setItems]=useState(historyData);
  const [progress,setProgress]=useState(0);
  const [notice,setNotice]=useState("");
  const [dark,setDark]=useState(false);
  const [lang,setLang]=useState("en");
  const [cam,setCam]=useState(false);
  const [stream,setStream]=useState(null);
  const [selectedCrop,setSelectedCrop]=useState("auto");
  const [floatOpen,setFloatOpen]=useState(false);
  const fileRef=useRef(null);
  const videoRef=useRef(null);
  const canvasRef=useRef(null);
  const t=LANG[lang];
  const imageUrl=result?.image?`${API}/api/uploads/${result.image}`:preview;

  const go=useCallback(p=>{setPage(p);window.scrollTo({top:0,behavior:"smooth"})},[]);
  const auth=useCallback(m=>{setAuthMode(m);go("auth")},[go]);

  function pick(f){if(!f)return;setFile(f);setPreview(URL.createObjectURL(f));setNotice("✅ Image selected successfully.")}
  async function startCamera(){
    try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});setStream(s);setCam(true);setTimeout(()=>{if(videoRef.current)videoRef.current.srcObject=s},100)}
    catch{setNotice("⚠️ Camera access denied. Please allow camera or use file upload.")}
  }
  function stopCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());setStream(null);setCam(false)}
  function capture(){const v=videoRef.current,c=canvasRef.current;if(!v||!c)return;c.width=v.videoWidth||900;c.height=v.videoHeight||600;c.getContext("2d").drawImage(v,0,0,c.width,c.height);c.toBlob(b=>{pick(new File([b],`leaf-${Date.now()}.jpg`,{type:"image/jpeg"}));stopCamera()},"image/jpeg",.92)}

  async function analyze(){
    go("analysis");setProgress(0);let n=0;
    const timer=setInterval(()=>{n=Math.min(96,n+6+Math.floor(Math.random()*8));setProgress(n)},220);
    try{
      let data;
      if(file){
        const form=new FormData();
        form.append("file",file);
        form.append("selected_crop",selectedCrop);
        const res=await fetch(`${API}/api/analyze`,{method:"POST",headers:authHeaders(),body:form});
        data=await res.json();
        if(!res.ok || data.model_error){
          throw new Error(data?.detail || data?.model_error || "Real AI backend prediction failed");
        }
      }
      else{
        await new Promise(r=>setTimeout(r,2200));
        data={...defaultResult,id:`demo-${Date.now()}`,date:new Date().toLocaleString()};
      }
      clearInterval(timer);setProgress(100);setResult(data);
      setItems(prev=>[{...data,severityLevel:data.severity?.toLowerCase()||"moderate"},...prev].slice(0,20));
      setTimeout(()=>go("result"),700);
    }catch(err){
      clearInterval(timer);
      setProgress(0);
      setNotice(`⚠️ Real AI prediction failed: ${err.message}. Please make sure the backend is running on port 8000, then scan again.`);
      go("scan");
    }
  }

  function printReport(reportLang="en"){
    const {bn,html}=buildReportHTML(result,reportLang);
    const w=window.open("","_blank");
    w.document.write(`<html lang="${bn?"bn":"en"}"><head><title>PhytoSentry Report</title><style>body{font-family:${bn?"'Nirmala UI','Vrinda','SolaimanLipi',sans-serif":"Georgia,serif"};padding:40px;max-width:850px;margin:auto;color:#1a2e0e;line-height:1.55}h1{color:#2d5a1b;border-bottom:3px solid #2d5a1b;padding-bottom:12px}h2{color:#3d6b28;margin-top:8px}.box{border:1px solid #c5d9a8;padding:18px;margin:14px 0;border-radius:10px;background:#f8fdf4}li{margin:8px 0;line-height:1.6}.badge{display:inline-block;background:#dce9c7;color:#2d5a1b;padding:6px 14px;border-radius:20px;font-weight:bold;margin:4px 2px}@media print{body{padding:24px}}</style></head><body>${html}</body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  }

  useEffect(()=>{document.body.classList.toggle("dark",dark);document.body.classList.toggle("light",!dark)},[dark]);
  useEffect(()=>{
    try{
      if(user) localStorage.setItem("ps_user",JSON.stringify(user));
      else{localStorage.removeItem("ps_user");localStorage.removeItem("ps_token");}
    }catch{}
  },[user]);
  useEffect(()=>{
    let alive=true;
    async function validateSession(){
      const token=getAuthToken();
      if(!token) return;
      try{
        const res=await fetch(`${API}/api/me`,{headers:authHeaders()});
        const data=await res.json().catch(()=>({}));
        if(!alive) return;
        if(res.ok && data.user){setUser(data.user);}
        else{localStorage.removeItem("ps_token");localStorage.removeItem("ps_user");setUser(null);}
      }catch{}
    }
    validateSession();
    return()=>{alive=false};
  },[]);

  useEffect(()=>{
    let alive=true;
    async function loadHistory(){
      try{
        const res=await fetch(`${API}/api/history`,{headers:authHeaders()});
        if(!res.ok) return;
        const data=await res.json();
        if(alive && Array.isArray(data) && data.length){
          setItems(data.map(x=>({...x,severityLevel:(x.severityLevel||x.severity||"low").toLowerCase()})));
        }
      }catch{}
    }
    loadHistory();
    return()=>{alive=false};
  },[user]);
  useEffect(()=>{const id=setTimeout(()=>translateStaticUI(lang),0);return()=>clearTimeout(id)},[lang,page,notice,result,items,user,dark,progress]);
  useEffect(()=>{
    let timer=null;
    const run=()=>{clearTimeout(timer);timer=setTimeout(()=>translateStaticUI(lang),60)};
    run();
    const obs=new MutationObserver(run);
    obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});
    return()=>{clearTimeout(timer);obs.disconnect();};
  },[lang]);

  return(
    <div className={`app${dark?" dark":""}${lang==="bn"?" bn":""}`}>
      <Header page={page} go={go} auth={auth} user={user} setUser={setUser} dark={dark} setDark={setDark} lang={lang} setLang={setLang} t={t}/>
      <main className="mainFrame">
        {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
        {page==="home"&&<HomePage auth={auth} go={go} t={t}/>}
        {page==="auth"&&<AuthPage mode={authMode} setMode={setAuthMode} setUser={setUser} go={go} setNotice={setNotice} t={t}/>}
        {page==="profile"&&<ProfilePage user={user||defaultUser} setUser={setUser} go={go} t={t}/>}
        {page==="scan"&&<ScanPage fileRef={fileRef} preview={preview} pick={pick} analyze={analyze} startCamera={startCamera} go={go} t={t} selectedCrop={selectedCrop} setSelectedCrop={setSelectedCrop}/>}
        {page==="analysis"&&<AnalysisPage preview={preview} progress={progress} go={go} t={t}/>}
        {page==="result"&&<ResultPage result={result} imageUrl={imageUrl} go={go} t={t}/>}
        {page==="treatment"&&<TreatmentPage result={result} printReport={printReport} go={go} t={t}/>}
        {page==="history"&&<HistoryPage items={items} go={go} t={t} lang={lang}/>}
        {page==="payments"&&<PaymentsPage go={go} t={t}/>}
        {page==="about"&&<AboutPage go={go} t={t}/>}
        {page==="settings"&&<SettingsPage dark={dark} setDark={setDark} lang={lang} setLang={setLang} go={go} t={t}/>}
        {page==="dashboard"&&<DashboardPage items={items} go={go} t={t} lang={lang}/>}
        {page==="experts"&&<ExpertsPage go={go} t={t}/>}
        {page==="weather"&&<WeatherPage go={go} t={t}/>}
        {page==="admin"&&<AdminPage items={items} go={go} t={t} lang={lang}/>}
      </main>

<footer className="siteFooter richFooter">
  <div className="footerInner footerGrid">

    <div className="footerBrand footerBrandBlock">
      <DocPlantLogo size="lg"/>

      <div>
        <b>{t.brand}</b>

        <p>{t.slogan}</p>

        <p className="footerCopy">
          © 2026 PhytoSentry · All rights reserved
        </p>

        <p className="footerMadeFor">
          Made for Bangladeshi farmers
        </p>

        {/* Developer Info */}
        <div className="footerDeveloperInfo">
          <p>
            Developed by <strong>Joy</strong><br />
            Student of Department of CSE<strong>
            Jagannath University</strong>
          </p>

          <a href="mailto:joyanonda@gmail.com">
            📧 joyanonda@gmail.com
          </a>
        </div>

      </div>
    </div>

    {/* এখান থেকে তোমার PRODUCT column থাকবে */}
    <div className="footerCol">
      <h4>PRODUCT</h4>
      {[["scan","Scan Leaf"],["dashboard","Dashboard"],["history","History"],["weather","Weather"]].map(([id,l])=>(
        <button
          key={id}
          className={page===id?"active":""}
          onClick={()=>go(id)}
        >
          {l}
        </button>
      ))}
    </div>

    {/* COMPANY unchanged */}
    <div className="footerCol">
      <h4>COMPANY</h4>
      {[["about","About"],["experts","Experts"],["payments","Pricing"],["admin","Admin"]].map(([id,l])=>(
        <button
          key={id}
          className={page===id?"active":""}
          onClick={()=>go(id)}
        >
          {l}
        </button>
      ))}
    </div>

    {/* SUPPORT unchanged */}
    <div className="footerCol">
      <h4>SUPPORT</h4>

      {[["settings","Settings"],["auth","Sign In"]].map(([id,l])=>(
        <button
          key={id}
          className={(id==='auth' ? page==='auth' : page===id)?"active":""}
          onClick={()=>id==='auth'?auth('signin'):go(id)}
        >
          {l}
        </button>
      ))}

      <a className="footerHotline" href="tel:+8801700000000">
        <Phone size={16}/> 24/7 Hotline
      </a>
    </div>

  </div>
</footer>

      {/* Floating action widget */}
      <div className={`fab ${floatOpen?"open":""}`}>
        <button className="fabMain" onClick={()=>setFloatOpen(!floatOpen)}>{floatOpen?<X size={22}/>:<Plus size={22}/>}</button>
        {floatOpen&&<div className="fabMenu">
          <button onClick={()=>{go("scan");setFloatOpen(false)}}><ScanLine size={17}/> Scan</button>
          <button onClick={()=>{go("history");setFloatOpen(false)}}><History size={17}/> History</button>
          <button onClick={()=>{go("experts");setFloatOpen(false)}}><Users size={17}/> Experts</button>
          <button onClick={()=>{go("weather");setFloatOpen(false)}}><Cloud size={17}/> Weather</button>
        </div>}
      </div>

      <ChatbotWidget lang={lang} page={page} user={user} go={go}/>

      {cam&&<CameraModal videoRef={videoRef} canvasRef={canvasRef} capture={capture} stop={stopCamera}/>}

      <div id="print-report" style={{display:"none"}}>
        <h1>🌿 PhytoSentry Plant Disease Report</h1>
        <p>Generated: {new Date().toLocaleString()}</p>
        <div className="box"><h2>{result.disease}</h2><p><i>{result.scientific}</i></p>
          <span className="badge">Confidence: {result.confidence}%</span>
          <span className="badge">Severity: {result.severity}</span>
          <span className="badge">Affected Area: {result.affected_area}</span>
        </div>
        <div className="box"><h2>Disease Overview</h2><p>{result.overview}</p></div>
        <div className="box"><h2>Symptoms</h2><ul>{result.symptoms.map((s,i)=><li key={i}>{s}</li>)}</ul></div>
        <div className="box"><h2>Treatments</h2><ul>{result.treatments.map(tr=><li key={tr.name}><b>{tr.type} – {tr.name}:</b> {tr.dose}</li>)}</ul></div>
        <div className="box"><h2>Prevention</h2><ul>{result.prevention.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
      </div>
    </div>
  );
}

function DocPlantLogo({size="md"}){
  return(
    <span className={`docplantLogo ${size}`} aria-hidden="true">
      <img src={logoImg} alt="PhytoSentry logo" className="docplantLogoImg"/>
    </span>
  );
}

// ── 24/7 Website Support Chatbot ─────────────────────────────────────────────
const CHATBOT_TEXT = {
  en: {
    title:"PhytoSentry Assistant", sub:"24/7 website support", placeholder:"Ask about scan, report, login...", send:"Send",
    welcome:"Hi! I can help with PhytoSentry leaf scan, reports, login, weather risk, treatment, payments, and expert support.",
    offline:"I could not reach the support API, but I can still help with basic PhytoSentry website guidance.",
    quick:["How to scan?","PDF report","Login help","Weather risk","Expert help"],
  },
  bn: {
    title:"PhytoSentry সহকারী", sub:"২৪/৭ website support", placeholder:"স্ক্যান, রিপোর্ট, লগইন নিয়ে প্রশ্ন করুন...", send:"পাঠান",
    welcome:"স্বাগতম! আমি PhytoSentry পাতা স্ক্যান, রিপোর্ট, লগইন, আবহাওয়া ঝুঁকি, চিকিৎসা, পেমেন্ট ও বিশেষজ্ঞ সহায়তা নিয়ে সাহায্য করতে পারি।",
    offline:"Support API-তে সংযোগ পাওয়া যায়নি, তবে আমি basic PhytoSentry website guide দিতে পারি।",
    quick:["কিভাবে স্ক্যান করব?","পিডিএফ রিপোর্ট","লগইন সহায়তা","আবহাওয়া ঝুঁকি","বিশেষজ্ঞ সহায়তা"],
  }
};

function chatbotLocalAnswer(message,lang="en"){
  const bn=lang==="bn";
  const q=(message||"").toLowerCase();
  const has=(...words)=>words.some(w=>q.includes(w.toLowerCase()));
  if(has("scan","leaf","upload","photo","image","camera","স্ক্যান","পাতা","ছবি","আপলোড")){
    return bn?"Scan Leaf পেজে যান, ফসল নির্বাচন করুন, পরিষ্কার পাতার ছবি দিন, তারপর Analyze Leaf চাপুন। দিনের আলো ও clear focus ব্যবহার করুন।":"Go to Scan Leaf, select crop, upload/capture a clear leaf photo, then press Analyze Leaf. Use daylight and clear focus.";
  }
  if(has("report","pdf","print","download","রিপোর্ট","পিডিএফ","প্রিন্ট")){
    return bn?"Treatment বা History পেজ থেকে PDF BN/Print BN দিলে বাংলা রিপোর্ট পাবেন। PDF EN/Print EN দিলে ইংরেজি রিপোর্ট পাবেন।":"From Treatment or History, use PDF BN/Print BN for Bangla reports and PDF EN/Print EN for English reports.";
  }
  if(has("login","signup","password","account","লগইন","পাসওয়ার্ড","অ্যাকাউন্ট")){
    return bn?"Sign Up দিয়ে অ্যাকাউন্ট তৈরি করুন, তারপর Sign In করুন। পাসওয়ার্ড ভুলে গেলে Forgot Password ব্যবহার করুন।":"Create an account with Sign Up, then Sign In. Use Forgot Password if you need a reset token.";
  }
  if(has("weather","risk","rain","humidity","আবহাওয়া","ঝুঁকি","বৃষ্টি")){
    return bn?"Weather পেজ live weather data দিয়ে disease risk দেখায়। API fail করলে cached data দেখানো হয়।":"The Weather page shows disease risk using live weather data. If the API fails, cached data is shown.";
  }
  if(has("expert","booking","consult","বিশেষজ্ঞ","পরামর্শ","বুকিং")){
    return bn?"Expert Connect পেজ থেকে কৃষি বিশেষজ্ঞের সাহায্য নিতে পারবেন। জরুরি অবস্থায় hotline ব্যবহার করুন।":"Use Expert Connect for agricultural expert help. Use the hotline for urgent crop issues.";
  }
  return bn?"আমি PhytoSentry website-এর scan, report, login, weather, treatment, payment এবং expert support নিয়ে সাহায্য করতে পারি।":"I can help with PhytoSentry scan, report, login, weather, treatment, payment, and expert support.";
}

function ChatbotWidget({lang,page,user,go}){
  const text=CHATBOT_TEXT[lang]||CHATBOT_TEXT.en;
  const [open,setOpen]=useState(false);
  const [input,setInput]=useState("");
  const [sending,setSending]=useState(false);
  const [quick,setQuick]=useState(text.quick);
  const [messages,setMessages]=useState(()=>{
    try{
      const stored=JSON.parse(localStorage.getItem("ps_chat_messages")||"null");
      if(Array.isArray(stored)&&stored.length) return stored.slice(-40);
    }catch{}
    return [{role:"bot",text:(CHATBOT_TEXT[lang]||CHATBOT_TEXT.en).welcome,ts:Date.now()}];
  });
  const sessionIdRef=useRef("");
  useEffect(()=>{
    try{
      let sid=localStorage.getItem("ps_chat_session");
      if(!sid){sid=`chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;localStorage.setItem("ps_chat_session",sid)}
      sessionIdRef.current=sid;
    }catch{sessionIdRef.current=`chat-${Date.now()}`}
  },[]);
  useEffect(()=>{try{localStorage.setItem("ps_chat_messages",JSON.stringify(messages.slice(-40)))}catch{}},[messages]);
  useEffect(()=>{setQuick(text.quick)},[lang]);
  async function ask(raw){
    const msg=(raw||input).trim();
    if(!msg||sending) return;
    setInput("");
    setMessages(prev=>[...prev,{role:"user",text:msg,ts:Date.now()}]);
    setSending(true);
    try{
      const res=await fetch(`${API}/api/chatbot`,{method:"POST",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({message:msg,lang,page,session_id:sessionIdRef.current})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data?.detail||"Chatbot API failed");
      setMessages(prev=>[...prev,{role:"bot",text:data.answer,ts:Date.now(),intent:data.intent}]);
      if(Array.isArray(data.quick_replies)&&data.quick_replies.length) setQuick(data.quick_replies.slice(0,5));
    }catch{
      setMessages(prev=>[...prev,{role:"bot",text:`${text.offline}\n\n${chatbotLocalAnswer(msg,lang)}`,ts:Date.now(),intent:"offline"}]);
      setQuick(text.quick);
    }finally{setSending(false)}
  }
  function goShortcut(target){setOpen(false);go(target)}
  return(
    <div className={`chatbotWidget ${open?"open":""}`}>
      {open&&<div className="chatbotPanel" role="dialog" aria-label={text.title}>
        <div className="chatbotHead">
          <div className="chatbotAvatar"><MessageCircle size={20}/></div>
          <div><b>{text.title}</b><span>{text.sub}{user?.name?` · ${user.name.split(" ")[0]}`:""}</span></div>
          <button onClick={()=>setOpen(false)} aria-label="Close chatbot"><X size={18}/></button>
        </div>
        <div className="chatbotShortcuts">
          <button onClick={()=>goShortcut("scan")}>{lang==="bn"?"স্ক্যান":"Scan"}</button>
          <button onClick={()=>goShortcut("history")}>{lang==="bn"?"রিপোর্ট":"Reports"}</button>
          <button onClick={()=>goShortcut("experts")}>{lang==="bn"?"বিশেষজ্ঞ":"Expert"}</button>
        </div>
        <div className="chatbotMessages">
          {messages.map((m,i)=><div key={i} className={`chatMsg ${m.role}`}><span>{m.text}</span></div>)}
          {sending&&<div className="chatMsg bot typing"><span>{lang==="bn"?"লিখছে...":"Typing..."}</span></div>}
        </div>
        <div className="chatQuick">
          {quick.map(q=><button key={q} onClick={()=>ask(q)}>{q}</button>)}
        </div>
        <form className="chatInput" onSubmit={e=>{e.preventDefault();ask()}}>
          <input value={input} onChange={e=>setInput(e.target.value)} placeholder={text.placeholder} maxLength={500}/>
          <button disabled={!input.trim()||sending} aria-label={text.send}><ArrowRight size={18}/></button>
        </form>
      </div>}
      <button className="chatbotToggle" onClick={()=>setOpen(!open)} aria-label={text.title}>
        {open?<X size={22}/>:<MessageCircle size={23}/>}<span>{open?"":(lang==="bn"?"সাপোর্ট":"Support")}</span>
      </button>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────
function Header({page,go,auth,user,setUser,dark,setDark,lang,setLang,t}){
  const [open,setOpen]=useState(false);
  const nav=[["home",t.home],["scan",t.scan],["dashboard",t.dashboard],["payments",t.payments||"Payments"],["about",t.about||"About"],["experts","Experts"],["weather","Weather"],["admin","Admin"]];
  return(
    <header className="topnav">
      <button className="brand" onClick={()=>go("home")}>
        <DocPlantLogo />
        <span><b>{t.brand}</b><small>{t.slogan}</small></span>
      </button>
      <button className="menuBtn" onClick={()=>setOpen(!open)}><Menu size={21}/></button>
      <nav className={`navlinks${open?" open":""}`}>
        <div className="navRow">
          {nav.slice(0,4).map(([id,l])=><button key={id} className={page===id?"active":""} onClick={()=>{go(id);setOpen(false)}}>{l}</button>)}
        </div>
        <div className="navRow">
          {nav.slice(4,8).map(([id,l])=><button key={id} className={page===id?"active":""} onClick={()=>{go(id);setOpen(false)}}>{l}</button>)}
        </div>
      </nav>
      <div className="navRight">
        <button className="iconBtn" onClick={()=>setDark(!dark)} title="Toggle theme">{dark?<Sun size={17}/>:<Moon size={17}/>}</button>
        <button className="iconBtn langBtn" onClick={()=>setLang(lang==="en"?"bn":"en")}>{lang==="en"?"বাং":"EN"}</button>
        {user
          ?<button className="avatarBtn" onClick={()=>go("profile")}><User size={15}/> {user.name.split(" ")[0]}</button>
          :<button className="signInBtn" onClick={()=>auth("signin")}><LogIn size={15}/> {t.signin}</button>
        }
      </div>
    </header>
  );
}

// ── Home ───────────────────────────────────────────────────────────────────────
function HomePage({auth,go,t}){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>setMounted(true),80);return()=>clearTimeout(id)},[]);
  const diagnostics=[
    {label:"Leaf Integrity",value:"98.2%",icon:<ShieldCheck size={18}/>,bar:98},
    {label:"Pathogen Scan",value:"38+",icon:<Microscope size={18}/>,bar:86},
    {label:"Risk Forecast",value:"24/7",icon:<Cloud size={18}/>,bar:92},
  ];
  return(
    <section className={`homePage viveHome${mounted?" mounted":""}`}>
      <div className="viveHero">
        <div className="viveBg">
          <span className="viveGrid"/>
          <span className="viveOrbGlow one"/>
          <span className="viveOrbGlow two"/>
        </div>

        <div className="viveHeroContent">
          <div className="viveLeft">
            <div className="viveKicker orbitKicker"><span className="kickerIconWrap"><span className="kickerOrbit"/><Zap size={14} className="kickerGlyph"/></span><span className="kickerText">NEXT-GEN AGRICULTURAL AI · BANGLADESH</span></div>
            <h1 className="viveTitle">Detect Plant Disease Before It Spreads</h1>
            <p className="viveLead">{t.slogan}. Upload a leaf, scan symptoms, get confidence scores and instant treatment guidance for healthier crops.</p>

            <div className="viveActions">
              <button className="primaryBtn glow" onClick={()=>go("scan")}><ScanLine size={19}/> Start Leaf Scan<span className="shine"/></button>
              <button className="ghostBtn" onClick={()=>auth("signup")}><UserPlus size={17}/> Create Account</button>
            </div>

            <div className="viveMiniStats">
              {[["50K+","Scans Processed"],["98.2%","Detection Accuracy"],["38+","Plant Diseases"]].map(([v,l])=>(
                <div key={l} className="viveMiniStat"><b>{v}</b><span>{l}</span></div>
              ))}
            </div>
          </div>

          <div className="viveCenter">
            <div className="viveScanner">
              <div className="orbit orbit1"/>
              <div className="orbit orbit2"/>
              <div className="orbit orbit3"/>
              <div className="scannerCore">
                <img src={logoImg} alt="PhytoSentry" />
                <div className="coreScan"/>
              </div>
              <div className="node n1"><Leaf size={16}/></div>
              <div className="node n2"><Activity size={16}/></div>
              <div className="node n3"><Shield size={16}/></div>
            </div>
          </div>

          <aside className="vivePanel">
            <div className="panelHead">
              <div><small>LIVE DIAGNOSIS</small><b>Tomato Leaf</b></div>
              <span className="panelStatus">ONLINE</span>
            </div>
            <div className="panelDisease">
              <AlertTriangle size={20}/>
              <div><b>Early Blight Risk</b><p>Moderate severity · 93.6% confidence</p></div>
            </div>
            <div className="panelMetrics">
              {diagnostics.map(d=>(
                <div className="panelMetric" key={d.label}>
                  <div className="metricTop">{d.icon}<span>{d.label}</span><b>{d.value}</b></div>
                  <div className="metricBar"><span style={{width:`${d.bar}%`}}/></div>
                </div>
              ))}
            </div>
            <button className="outlineBtn wide" onClick={()=>go("treatment")}>View Treatment Plan <ArrowRight size={15}/></button>
          </aside>
        </div>
      </div>

      <div className="howSection">
        <h2 className="secTitle">How It <span className="accent">Works</span></h2>
        <p className="secSub">Three simple steps to protect your crops</p>
        <div className="howGrid">
          {[{n:"01",icon:<UploadCloud size={26}/>,title:"Upload Photo",text:"Take a clear photo of the affected leaf using your phone camera or gallery."},{n:"02",icon:<Cpu size={26}/>,title:"AI Analysis",text:"Deep learning scans 38+ diseases with 98.2% accuracy in under 3 seconds."},{n:"03",icon:<FlaskConical size={26}/>,title:"Get Treatment",text:"Receive severity scores and expert organic, biological & chemical plans."}].map((s,i)=>(
            <div key={s.n} className="howCard">
              <div className="howNum">{s.n}</div><div className="howIco">{s.icon}</div>
              <h3>{s.title}</h3><p>{s.text}</p>
              {i<2&&<div className="howArrow"><ArrowRight size={18}/></div>}
            </div>
          ))}
        </div>
      </div>

      <h2 className="secTitle" style={{marginBottom:6}}>Everything You <span className="accent">Need</span></h2>
      <p className="secSub" style={{marginBottom:24}}>Powerful AI tools built for Bangladesh farmers</p>
      <div className="featureGrid">
        {[{icon:<ScanLine/>,title:"AI Leaf Scan",text:"98.2% accurate detection from a single photo.",c:"green"},{icon:<Layers/>,title:"Top-3 Predictions",text:"Confidence-ranked results with severity breakdown.",c:"blue"},{icon:<FlaskConical/>,title:"Treatment Plans",text:"Organic, biological & chemical solutions.",c:"orange"},{icon:<FileText/>,title:"PDF Reports",text:"Download full scan reports anytime.",c:"purple"},{icon:<Cloud/>,title:"Weather Risk",text:"Real-time disease risk based on local weather.",c:"teal"},{icon:<Users/>,title:"Expert Connect",text:"Direct access to agricultural experts.",c:"red"}].map(f=>(
          <div key={f.title} className={`fCard fc-${f.c}`}>
            <div className="fcIco">{f.icon}</div><h3>{f.title}</h3><p>{f.text}</p>
            <div className="fCardArr"><ChevronRight size={14}/></div>
          </div>
        ))}
      </div>

      <div className="testimonialSection">
        <h2 className="secTitle">Farmers <span className="accent">Love It</span></h2>
        <p className="secSub">Real stories from real farmers</p>
        <div className="testimonialGrid">
          {[{name:"Abdul Karim",role:"Tomato Farmer, Sylhet",text:"PhytoSentry detected early blight before it spread. Saved 40% of my yield!",rating:5},{name:"Fatema Begum",role:"Vegetable Grower, Dhaka",text:"Got treatment advice within seconds. Incredible accuracy. Highly recommend.",rating:5},{name:"Mohammad Hasan",role:"Grape Farmer, Rajshahi",text:"The weather risk feature warned me 2 days before powdery mildew appeared.",rating:5}].map(t=>(
            <div key={t.name} className="tCard">
              <div className="tStars">{Array.from({length:t.rating}).map((_,i)=><Star key={i} size={12}/>)}</div>
              <p className="tText">“{t.text}”</p>
              <div className="tAuthor"><div className="tAva"><User size={17}/></div><div><b>{t.name}</b><small>{t.role}</small></div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="ctaBanner">
        <div className="ctaBg"><div className="orb orb1" style={{opacity:.35}}/></div>
        <div className="ctaBody"><DocPlantLogo size="lg"/><div><h2>Ready to protect your crops?</h2><p>Join 50,000+ farmers already using PhytoSentry AI</p></div><button className="primaryBtn glow" onClick={()=>go("scan")}><ScanLine size={18}/>Scan Your First Leaf<span className="shine"/></button></div>
      </div>

      <div className="cropStrip viveCropStrip">
        <span className="stripTag"><Wheat size={14}/> Supported Crops</span>
        {cropTypes.map(c=><span key={c.id} className="cropChip">{c.icon} {c.name}</span>)}
      </div>

      <div className="alertBanner viveAlert" onClick={()=>go("weather")}>
        <AlertTriangle size={18}/>
        <div><b>High Fungal Risk Today</b><p>Humidity 87%, temperature 28°C — ideal for Late Blight. Check prevention before symptoms spread.</p></div>
        <button className="ghostBtn sm">View Details <ChevronRight size={15}/></button>
      </div>
    </section>
  );
}

// ── Auth ───────────────────────────────────────────────────────────────────────
function AuthPage({mode,setMode,setUser,go,setNotice,t}){
  const [form,setForm]=useState(()=>{
    const qs=new URLSearchParams(window.location.search);
    return {
      name:"",
      identifier:qs.get("identifier")||qs.get("email")||"",
      email:qs.get("email")||"",
      phone:"",
      password:"",
      token:qs.get("reset_token")||"",
      newPassword:"",
      verifyCode:""
    };
  });
  const [loading,setLoading]=useState(false);
  const isPhone=s=>/^\+?\d[\d\s\-().]{6,}$/.test(String(s||"").trim());
  const identifierValue=()=>{
    if(mode==="signup") return (form.phone||form.email||"").trim();
    return (form.identifier||form.email||form.phone||"").trim();
  };
  async function submit(e){
    e.preventDefault();setLoading(true);
    const ep=mode==="signup"?"/api/signup":mode==="forgot"?"/api/forgot-password":mode==="reset"?"/api/reset-password":"/api/login";
    const payload=mode==="signup"
      ?{name:form.name,email:form.email,phone:form.phone,password:form.password}
      :mode==="reset"
        ?{identifier:identifierValue(),token:form.token,password:form.newPassword}
        :mode==="forgot"
          ?{identifier:identifierValue()}
          :{identifier:identifierValue(),password:form.password};
    try{
      const res=await fetch(`${API}${ep}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok){setNotice(`⚠️ ${data.detail||data.message||"Authentication failed."}`);setLoading(false);return;}
      if(data.user){
        try{localStorage.setItem("ps_user",JSON.stringify(data.user)); if(data.token) localStorage.setItem("ps_token",data.token); }catch{}
        setUser(data.user);go("profile")
      }
      const dev = data?.verification?.dev_code || data?.reset_token;
      setNotice(`${data.message||"Done."}${dev?` Demo code/token: ${dev}`:""}`);
    }catch(err){
      setNotice(`⚠️ Could not connect to PhytoSentry backend database. ${err.message||""}`);
    }
    setLoading(false);
  }
  async function sendCode(){
    const identifier=identifierValue();
    if(!identifier){setNotice("⚠️ Enter your email or phone number first.");return;}
    try{
      const res=await fetch(`${API}/api/send-verification`,{method:"POST",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({identifier})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.detail||data.message||"Could not send verification code.");
      setNotice(`${data.message||"Verification code sent/queued."}${data.dev_code?` Demo OTP: ${data.dev_code}`:""}`);
    }catch(err){setNotice(`⚠️ ${err.message||"Verification failed."}`)}
  }
  async function verifyCode(){
    const identifier=identifierValue();
    if(!identifier||!form.verifyCode){setNotice("⚠️ Enter email/phone and the verification code.");return;}
    try{
      const res=await fetch(`${API}/api/verify-contact`,{method:"POST",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({identifier,code:form.verifyCode})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.detail||data.message||"Invalid verification code.");
      if(data.user){try{localStorage.setItem("ps_user",JSON.stringify(data.user));}catch{};setUser(data.user)}
      setNotice(data.message||"Verified successfully.");
    }catch(err){setNotice(`⚠️ ${err.message||"Verification failed."}`)}
  }
  return(
    <section className="authPage">
      <div className="authCard pageCard">
        <div className="authLeft">
          <div className="authBg"/>
          <img src={logoImg} alt="PhytoSentry logo" className="authLogo"/>
          <h2>{mode==="signup"?"Join PhytoSentry":mode==="forgot"?"Reset Password":mode==="reset"?"Reset with Token":"Welcome Back"}</h2>
          <p>Use either email or phone number to access PhytoSentry services.</p>
          <div className="authPerks">
            {["Email or phone sign in","OTP/code verification ready","38+ plant diseases covered","Instant PDF reports"].map(p=><div key={p}><CheckCircle2 size={15}/>{p}</div>)}
          </div>
        </div>
        <div className="authRight">
          <div className="authTabs">
            <button className={mode==="signin"?"active":""} onClick={()=>setMode("signin")}>{t.signin}</button>
            <button className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>{t.signup}</button>
          </div>
          <form className="authForm" onSubmit={submit}>
            {mode==="signup"&&<IField icon={<User size={15}/>} label="Full Name" type="text" value={form.name} onChange={v=>setForm({...form,name:v})} required/>}
            {mode==="signup"? <>
              <IField icon={<Mail size={15}/>} label="Email Address (optional if phone used)" type="email" value={form.email} onChange={v=>setForm({...form,email:v,identifier:v||form.phone})} required={false}/>
              <IField icon={<Phone size={15}/>} label="Phone Number (optional if email used)" type="tel" value={form.phone} onChange={v=>setForm({...form,phone:v,identifier:v||form.email})} required={false}/>
            </> : <IField icon={isPhone(form.identifier)?<Phone size={15}/>:<Mail size={15}/>} label="Email or Phone Number" type="text" value={form.identifier} onChange={v=>setForm({...form,identifier:v})} required/>}
            {mode==="reset"&&<IField icon={<Lock size={15}/>} label="Reset Token" type="text" value={form.token} onChange={v=>setForm({...form,token:v})} required/>}
            {mode==="reset"&&<IField icon={<Lock size={15}/>} label="New Password" type="password" value={form.newPassword} onChange={v=>setForm({...form,newPassword:v})} required/>}
            {mode!=="forgot"&&mode!=="reset"&&<IField icon={<Lock size={15}/>} label="Password" type="password" value={form.password} onChange={v=>setForm({...form,password:v})} required/>}
            {(mode==="signup"||mode==="signin")&&<div className="verifyBox">
              <button type="button" className="verifyBtn" onClick={sendCode}><ShieldCheck size={14}/> Send Verification Code</button>
              <div className="verifyInline">
                <input className="iInput" value={form.verifyCode} onChange={e=>setForm({...form,verifyCode:e.target.value})} placeholder="Enter OTP/code" maxLength={12}/>
                <button type="button" className="ghostBtn sm" onClick={verifyCode}>Verify</button>
              </div>
            </div>}
            <button className={`primaryBtn wide${loading?" loading":""}`} disabled={loading}>
              {loading&&<RefreshCw size={16} className="spin"/>}
              {mode==="signup"?"Create Account":mode==="forgot"?"Send Reset Code":mode==="reset"?"Reset Password":"Sign In"} <ArrowRight size={16}/>
            </button>
            {mode==="forgot"&&<button type="button" className="linkBtn" onClick={()=>setMode("reset")}>Already have a reset token?</button>}
            <button type="button" className="linkBtn" onClick={()=>setMode(mode==="forgot"||mode==="reset"?"signin":"forgot")}>{mode==="forgot"||mode==="reset"?"← Back to Sign In":"Forgot Password?"}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
const IField = memo(function IField({icon,label,type,value,onChange,required}){
  return(
    <label className="iField">
      <span className="iLabel">{icon}{label}</span>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required} className="iInput"/>
    </label>
  );
});

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Side({active,go,t}){
  const items=[
    ["profile",t.profile||"Profile",User],["scan",t.scan||"Scan Leaf",ScanLine],
    ["history",t.history||"History",History],["treatment",t.treatment||"Treatment",FileText],
    ["payments",t.payments||"Payments",CreditCard],["experts","Experts",Users],
    ["weather","Weather",Cloud],["settings",t.settings||"Settings",Settings],
  ];
  return(
    <aside className="sidebar">
      <div className="sbBrand"><DocPlantLogo /> <span>{t.brand}</span></div>
      {items.map(([id,l,Icon])=>(
        <button key={id} className={`sbItem${active===id?" on":""}`} onClick={()=>go(id)}>
          <Icon size={16}/><span>{l}</span>
        </button>
      ))}
      <button className={`sbItem${active==="dashboard"?" on":""} sbBottom`} onClick={()=>go("dashboard")}>
        <BarChart3 size={16}/><span>Dashboard</span>
      </button>
    </aside>
  );
}

// ── Shared layout helpers ──────────────────────────────────────────────────────
const PageHdr = memo(function PageHdr({step,title,sub,icon}){
  return(
    <div className="pageHdr">
      <div className="pageHdrIcon">{icon}</div>
      <div><div className="pageStep">Step {step}</div><h1>{title}</h1><p>{sub}</p></div>
    </div>
  );
});
const TwoPanel = memo(function TwoPanel({sidebar,go,t,active,children}){
  return(
    <div className="twoPanel pageCard">
      <Side active={active} go={go} t={t}/>
      <div className="panelBody">{children}</div>
    </div>
  );
});

// ── Scan ───────────────────────────────────────────────────────────────────────
function ScanPage({fileRef,preview,pick,analyze,startCamera,go,t,selectedCrop,setSelectedCrop}){
  return(
    <section className="innerPage">
      <PageHdr step="02" title={t.uploadTitle} sub={t.uploadSub} icon={<ScanLine size={26}/>}/>
      <TwoPanel active="scan" go={go} t={t}>
        <div className="panelTop">
          <div><h2>Upload / Scan Leaf</h2><p className="muted">Auto Detect is recommended. Crop selection is only a hint and will not override AI prediction.</p></div>
          <button className="outlineBtn" onClick={startCamera}><Camera size={16}/> {t.cameraBtn}</button>
        </div>
        <div className="cropSel">
          <label className="secLabel"><Wheat size={14}/> Crop Hint / Auto Detection</label>
          <div className="cropGrid">
            {cropTypes.map(c=>(
              <button key={c.id} className={`cropBtn${selectedCrop===c.id?" sel":""}`} onClick={()=>setSelectedCrop(c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>pick(e.target.files[0])}/>
        <button className="dropZone" onClick={()=>fileRef.current.click()}>
          {preview
            ?<div className="prevWrap"><img src={preview} alt="leaf"/><div className="prevOverlay"><Activity size={22}/> Ready to Analyze</div></div>
            :<div className="dropInner"><UploadCloud size={50}/><b>Drag & drop your leaf image here</b><span>or click to browse files</span><small>JPG · PNG · WEBP · up to 10MB</small></div>
          }
        </button>
        <div className="scanFoot">
          <div className="tipBox">
            <b><CheckCircle2 size={14}/> Photo Tips</b>
            {["Use natural daylight","Focus on the affected area","Avoid blurry or dark images","Include both healthy and affected parts"].map(tip=>(
              <div key={tip} className="tipRow"><CheckCircle2 size={13}/>{tip}</div>
            ))}
          </div>
          <button className="primaryBtn analyzeBtn" onClick={analyze}>
            {preview?<><ScanLine size={17}/> {t.analyzeBtn}</>:<>{t.continueDemo} <ArrowRight size={17}/></>}
            <span className="shine"/>
          </button>
        </div>
      </TwoPanel>
    </section>
  );
}

// ── Analysis ───────────────────────────────────────────────────────────────────
function AnalysisPage({preview,progress,go,t}){
  const steps=["Image enhancement","Feature extraction","Pattern recognition","Disease classification","Confidence scoring"];
  const activeStep=Math.floor((progress/100)*steps.length);
  return(
    <section className="innerPage">
      <PageHdr step="03" title="Analysis in Progress" sub="AI analyzes the leaf and extracts key insights." icon={<Microscope size={26}/>}/>
      <div className="analysisCard pageCard">
        <div className="analysisSide">
          {preview?<img src={preview} alt="Leaf" className="analysisImg"/>:<div className="leafPlaceholder"/>}
          <div className="scanAnim"><div className="scanBeamV"/></div>
        </div>
        <div className="analysisBody">
          <h2>Analyzing Your Leaf...</h2>
          <p className="muted">Our deep learning model is processing your image.</p>
          <div className="circleWrap">
            <svg viewBox="0 0 120 120" className="pSvg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--line)" strokeWidth="8"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" strokeWidth="8"
                strokeDasharray={`${progress*3.14} 314`} strokeLinecap="round"
                transform="rotate(-90 60 60)" style={{transition:"stroke-dasharray .3s"}}/>
            </svg>
            <div className="pNum"><b>{progress}%</b><small>complete</small></div>
          </div>
          <div className="stepList">
            {steps.map((s,i)=>(
              <div key={s} className={`stepRow${i<activeStep?" done":i===activeStep?" act":""}`}>
                <span className="stepDot">{i<activeStep?<CheckCircle2 size={15}/>:<span className="dot"/>}</span>
                <span>{s}</span>
                {i===activeStep&&<span className="stepSpin"/>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Result ─────────────────────────────────────────────────────────────────────
function ResultPage({result,imageUrl,go,t}){
  const sevColor={Low:"green",Moderate:"orange",High:"red",None:"green"}[result.severity]||"orange";
  return(
    <section className="innerPage">
      <PageHdr step="04" title="Detection Result" sub="Disease name, confidence score, and severity analysis." icon={<BarChart3 size={26}/>}/>
      <div className="resultCard pageCard">
        <Side active="scan" go={go} t={t}/>
        <div className="resultMain">
          <div className="resultLeft">
            <div className="resultImgBox">
              {imageUrl?<img src={imageUrl} alt="Leaf"/>:<div className="leafPlaceholder tall"/>}
              <div className={`sevTag sev-${sevColor}`}>{result.severity}</div>
            </div>
            <div className="top3Box">
              <h3><Layers size={15}/> Top Predictions</h3>
              {result.top3.map((p,i)=>(
                <div key={i} className={`p3Row${i===0?" top":""}`}>
                  <span className="p3Rank">#{i+1}</span>
                  <div className="p3Info"><b>{p.disease}</b><small>{p.scientific}</small></div>
                  <div className="p3Conf">
                    <div className="confBar"><div className="confFill" style={{width:`${p.confidence}%`}}/></div>
                    <span>{p.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="resultRight">
            <div className={`diseaseBadge db-${sevColor}`}><Bug size={17}/> {result.disease}</div>
            <p className="sciName"><i>{result.scientific}</i></p>
            <div className="confScore"><span className="confNum">{result.confidence}%</span><span className="confLbl">Confidence Score</span></div>
            <div className="statsGrid">
              {[["Severity",result.severity,sevColor],["Affected Area",result.affected_area,null],["Stage",result.stage,null],["Crop",result.plant,null]].map(([l,v,c])=>(
                <div key={l} className={`statBox${c?` c-${c}`:""}`}><small>{l}</small><b>{v}</b></div>
              ))}
            </div>
            <div className="overviewBox">
              <h4><BookOpen size={15}/> Disease Overview</h4>
              <p>{result.overview}</p>
            </div>
            <div className="sympBox">
              <h4><AlertTriangle size={15}/> Symptoms</h4>
              {result.symptoms.map((s,i)=><div key={i} className="sympRow"><span className="dotRed"/>{s}</div>)}
            </div>
            <button className="primaryBtn wide mt" onClick={()=>go("treatment")}>View Treatment Plan <ArrowRight size={17}/></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Treatment ──────────────────────────────────────────────────────────────────
function TreatmentPage({result,printReport,go,t}){
  const typeC={Organic:"green",Biological:"blue",Chemical:"red"};
  return(
    <section className="innerPage">
      <PageHdr step="05" title="Treatment Recommendations" sub="Expert-backed solutions and prevention tips." icon={<FlaskConical size={26}/>}/>
      <TwoPanel active="treatment" go={go} t={t}>
        <div className="panelTop">
          <div><h2>Treatment for {result.disease}</h2><p className="muted">{result.overview}</p></div>
          <div className="rptBtns reportLangBtns">
            <button className="outlineBtn" onClick={()=>printReport("en")}><Printer size={16}/> Print EN</button>
            <button className="outlineBtn" onClick={()=>printReport("bn")}><Printer size={16}/> Print BN</button>
            <a className="outlineBtn" href={`${API}/api/report/${result.id}?lang=en${getAuthToken()?`&token=${encodeURIComponent(getAuthToken())}`:""}`} target="_blank" rel="noreferrer"><Download size={16}/> PDF EN</a>
            <a className="primaryBtn" href={`${API}/api/report/${result.id}?lang=bn${getAuthToken()?`&token=${encodeURIComponent(getAuthToken())}`:""}`} target="_blank" rel="noreferrer"><Download size={16}/> PDF BN</a>
          </div>
        </div>
        <div className="treatGrid">
          {result.treatments.map(tr=>(
            <div key={tr.name} className={`treatCard tc-${typeC[tr.type]}`}>
              <div className="treatTop">
                <span className={`treatType tt-${typeC[tr.type]}`}>{tr.type}</span>
                <div className="effWrap"><div className="effBar"><div className="effFill" style={{width:`${tr.effectiveness}%`}}/></div><span>{tr.effectiveness}%</span></div>
              </div>
              <h3>{tr.name}</h3><p>{tr.dose}</p>
            </div>
          ))}
        </div>
        <div className="prevBox">
          <h3><ShieldCheck size={17}/> Prevention Tips</h3>
          <div className="prevGrid">
            {result.prevention.map((p,i)=>(
              <div key={i} className="prevItem"><div className="prevNum">{i+1}</div><p>{p}</p></div>
            ))}
          </div>
        </div>
        <div className="remindBox">
          <Bell size={17}/>
          <div><b>Set Treatment Reminder</b><p>Get notified for spray schedules, watering times, and follow-up checks.</p></div>
          <button className="primaryBtn sm">Set Reminder</button>
        </div>
      </TwoPanel>
    </section>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function DashboardPage({items,go,t,lang="en"}){
  const total=items.length;
  const diseases=items.filter(i=>String(i.severity||"").toLowerCase()!=="none" && !String(i.disease||"").toLowerCase().includes("healthy")).length;
  const healthy=items.filter(i=>String(i.severity||"").toLowerCase()==="none" || String(i.disease||"").toLowerCase().includes("healthy")).length;
  const avg=total?Math.round(items.reduce((s,i)=>s+Number(i.confidence||0),0)/total*10)/10:0;
  const dist=["Early Blight","Late Blight","Powdery Mildew","Healthy"].map(name=>{
    const count=items.filter(i=>String(i.disease||"").toLowerCase().includes(name.toLowerCase().split(" ")[0])).length;
    return [name,total?`${Math.round((count/total)*100)}%`:"0%",name==="Healthy"?"teal":name==="Late Blight"?"orange":name==="Powdery Mildew"?"blue":"green"];
  });
  return(
    <section className="innerPage">
      <PageHdr step="06" title="Dashboard" sub="Track analyses, trends, and export reports." icon={<BarChart3 size={26}/>}/>
      <TwoPanel active="dashboard" go={go} t={t}>
        <div className="dash4">
          {[{icon:<ScanLine/>,l:"Total Scans",v:String(total),tr:"Live DB",c:"green"},
            {icon:<Bug/>,l:"Diseases Found",v:String(diseases),tr:"From history",c:"orange"},
            {icon:<CheckCircle2/>,l:"Healthy Leaves",v:String(healthy),tr:"From history",c:"blue"},
            {icon:<Activity/>,l:"Avg Confidence",v:`${avg}%`,tr:"Calculated",c:"purple"}
          ].map(d=>(
            <div key={d.l} className={`dCard dc-${d.c}`}>
              <div className="dIco">{d.icon}</div>
              <div><small>{d.l}</small><b>{d.v}</b><span className="dTr">{d.tr}</span></div>
            </div>
          ))}
        </div>
        <div className="chartRow">
          <div className="chartBox">
            <h3>Scan Activity (Last 7 Days)</h3>
            <div className="barChart">
              {[...Array(7)].map((_,i)=>{const v=Math.max(8,Math.min(34,total*4+i*3));return <div key={i} className="barWrap"><div className="bar" style={{height:`${v*3}px`}}/><span>{["M","T","W","T","F","S","S"][i]}</span></div>})}
            </div>
          </div>
          <div className="chartBox">
            <h3>Disease Distribution</h3>
            <div className="donutRow">
              <div className="donut3d"/>
              <div className="donutKey">
                {dist.map(([n,p,c])=>(
                  <div key={n} className="dKeyRow"><span className={`dKeyDot dk-${c}`}/><span>{n}</span><b>{p}</b></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <HistTable items={items} lang={lang}/>
      </TwoPanel>
    </section>
  );
}

// ── History ────────────────────────────────────────────────────────────────────
function HistoryPage({items,go,t,lang="en"}){
  const [q,setQ]=useState("");
  const filtered=items.filter(i=>i.plant.toLowerCase().includes(q.toLowerCase())||i.disease.toLowerCase().includes(q.toLowerCase()));
  return(
    <section className="innerPage">
      <PageHdr step="H" title="Scan History" sub="All previous scans with individual report downloads." icon={<History size={26}/>}/>
      <TwoPanel active="history" go={go} t={t}>
        <div className="panelTop">
          <h2>All Scans</h2>
          <div className="searchBox"><Search size={15}/><input placeholder="Search crop or disease..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        </div>
        <HistTable items={filtered} lang={lang}/>
      </TwoPanel>
    </section>
  );
}
const HistTable = memo(function HistTable({items,lang="en"}){
  return(
    <div className="histTable">
      <div className="histHead"><span>Crop</span><span>Disease</span><span>Confidence</span><span>Severity</span><span>Date</span><span>Report</span></div>
      {items.map((h,i)=>(
        <div key={h.id+i} className="histRow">
          <span><b>{h.plant}</b></span>
          <span>{h.disease}</span>
          <span className="conf">{h.confidence}%</span>
          <span className={`sevBadge sev-${h.severityLevel}`}>{h.severity}</span>
          <span className="dateCol">{h.date}</span>
          <a className="dlBtn" href={`${API}/api/report/${h.id}?lang=${lang}${getAuthToken()?`&token=${encodeURIComponent(getAuthToken())}`:""}`} target="_blank"><Download size={13}/> Report</a>
        </div>
      ))}
    </div>
  );
});

// ── Profile ────────────────────────────────────────────────────────────────────
function ProfilePage({user,setUser,go,t}){
  return(
    <section className="innerPage">
      <PageHdr step="P" title="User Profile" sub="Your account information and statistics." icon={<User size={26}/>}/>
      <TwoPanel active="profile" go={go} t={t}>
        <div className="profCard">
          <div className="profAva"><div className="avaCircle"><User size={52}/></div><div className={`planTag${user.plan==="premium"?" gold":""}`}>{user.plan==="premium"?<><Star size={11}/> Premium</>:"Free"}</div></div>
          <div className="profInfo">
            <h2>{user.name}</h2>
            <div className="profFields">
              {[[<Mail size={15}/>,user.email],[<Phone size={15}/>,user.phone],[<CheckCircle2 size={15}/>,`Account: ${user.verified?"✅ Verified":"⚠️ Pending"}`],[<Calendar size={15}/>,`Joined: ${user.created_at}`]].map(([ico,val],i)=>(
                <div key={i} className="profField">{ico}<span>{val}</span></div>
              ))}
            </div>
            <div className="profStats">
              {[[user.scans,"Total Scans"],[user.saved,"Reports Saved"],["91%","Avg. Confidence"]].map(([v,l])=>(
                <div key={l} className="profStat"><b>{v}</b><small>{l}</small></div>
              ))}
            </div>
            <div className="profileActions"><button className="primaryBtn mt">Edit Profile</button><button className="dangerBtn mt" onClick={async()=>{try{await fetch(`${API}/api/logout`,{method:"POST",headers:authHeaders()});localStorage.removeItem("ps_user");localStorage.removeItem("ps_token");}catch{};setUser(null);go("home")}}><LogOut size={15}/> Sign Out</button></div>
          </div>
        </div>
      </TwoPanel>
    </section>
  );
}


function AboutPage({ go, t }) {

  const stats = [
    ["50,000+", "FARMERS SERVED"],
    ["38+", "DISEASES DETECTED"],
    ["98.2%", "ACCURACY RATE"],
    ["64", "DISTRICTS"]
  ];

  const tech = [
    {
      icon: <Cpu size={18} />,
      title: "Deep Learning",
      text: "TensorFlow/Keras CNN trained on 120K+ leaf images"
    },
    {
      icon: <Shield size={18} />,
      title: "Secure Cloud",
      text: "End-to-end encryption, GDPR-compliant"
    },
    {
      icon: <Activity size={18} />,
      title: "Real-time API",
      text: "Sub-3 second inference, 99% uptime"
    },
    {
      icon: <Globe size={18} />,
      title: "Bilingual UI",
      text: "Full English and Bangla interface"
    }
  ];

  return (
    <section className="aboutPage aboutV2Page">

      <div className="aboutV2Head">
        <div className="aboutIcon">
          <Leaf size={28} />
        </div>

        <div>
          <span className="pageStep">STEP A</span>
          <h2 className="aboutTitle aboutV2Title">
            ABOUT PHYTOSENTRY
          </h2>
          <p className="aboutSub">
            Our mission, technology, and team.
          </p>
        </div>
      </div>

      <div className="aboutV2Grid">

        {/* Left Card */}

        <div className="pageCard aboutV2Story">

          <DocPlantLogo size="lg" />

          <h3>From Leaf to Life</h3>

          <p>
            PhytoSentry was built to empower Bangladeshi farmers with
            cutting-edge AI, making expert-level plant disease diagnosis
            accessible to everyone, anywhere.
          </p>

          <div className="developerBox">

            <h4>Developer</h4>

            <p>
              This website was developed by <strong>Joy</strong>,
              student of <strong>Jagannath University</strong>.
            </p>

            <a
              href="mailto:joyanonda@gmail.com"
              className="contactBtn"
            >
              📧 Contact Developer
            </a>

            <p className="devEmail">
              Email:
              <a href="mailto:joyanonda@gmail.com">
                {" "}joyanonda@gmail.com
              </a>
            </p>

          </div>

          <div className="aboutV2Stats">
            {stats.map(([v, l]) => (
              <div key={l} className="aboutV2Stat">
                <b>{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right Card */}

        <div className="pageCard techStackCard">

          <h3>TECHNOLOGY STACK</h3>

          <div className="techList">

            {tech.map(item => (

              <div
                key={item.title}
                className="techItem"
              >

                <div className="techIcon">
                  {item.icon}
                </div>

                <div>
                  <b>{item.title}</b>
                  <p>{item.text}</p>
                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

    </section>
  );
}
// ── Settings ───────────────────────────────────────────────────────────────────
function SettingsPage({dark,setDark,lang,setLang,go,t}){
  const [notif,setNotif]=useState(true);
  const [treat,setTreat]=useState(true);
  const [water,setWater]=useState(false);
  return(
    <section className="innerPage">
      <PageHdr step="S" title="Settings" sub="App preferences and notification settings." icon={<Settings size={26}/>}/>
      <TwoPanel active="settings" go={go} t={t}>
        <SGroup title="Appearance">
          <SRow icon={dark?<Sun size={17}/>:<Moon size={17}/>} title={t.darkMode} sub="Switch between light and dark mode"><Toggle v={dark} set={setDark}/></SRow>
          <SRow icon={<Globe size={17}/>} title={t.language} sub="Interface language">
            <select className="selEl" value={lang} onChange={e=>setLang(e.target.value)}><option value="en">English</option><option value="bn">বাংলা</option></select>
          </SRow>
        </SGroup>
        <SGroup title="Notifications">
          <SRow icon={<Bell size={17}/>} title="Push Notifications" sub="General scan alerts"><Toggle v={notif} set={setNotif}/></SRow>
          <SRow icon={<Thermometer size={17}/>} title="Treatment Reminders" sub="Spray and treatment alerts"><Toggle v={treat} set={setTreat}/></SRow>
          <SRow icon={<Droplets size={17}/>} title="Watering Reminders" sub="Scheduled watering"><Toggle v={water} set={setWater}/></SRow>
        </SGroup>
        <SGroup title="Account">
          <SRow icon={<Shield size={17}/>} title="Privacy & Data" sub="Control your data"><button className="outlineBtn sm">Manage</button></SRow>
          <SRow icon={<LogOut size={17}/>} title="Sign Out" sub="Sign out of your account"><button className="dangerBtn sm">Sign Out</button></SRow>
        </SGroup>
      </TwoPanel>
    </section>
  );
}
function SGroup({title,children}){return<div className="sGroup"><h3 className="sGrpTitle">{title}</h3>{children}</div>}
function SRow({icon,title,sub,children}){return<div className="sRow"><div className="sRowL"><span className="sIco">{icon}</span><div><b>{title}</b><p>{sub}</p></div></div>{children}</div>}
const Toggle = memo(function Toggle({v,set}){return<label className="toggle"><input type="checkbox" checked={v} onChange={e=>set(e.target.checked)}/><span className="tTrack"><span className="tThumb"/></span></label>});

// ── Experts ────────────────────────────────────────────────────────────────────
function ExpertsPage({go,t}){
  const experts=[
    {name:"Dr. Fabiha Islam",spec:"Plant Pathologist",area:"Dhaka",rating:4.9,exp:"15 yrs",available:true},
    {name:"Asma Begum",spec:"Agricultural Advisor",area:"Chittagong",rating:4.7,exp:"10 yrs",available:true},
    {name:"Rahim Molla",spec:"Crop Protection Specialist",area:"Sylhet",rating:4.8,exp:"12 yrs",available:false},
    {name:"Dr. Fariha Islam",spec:"Soil Scientist",area:"Rajshahi",rating:4.6,exp:"8 yrs",available:true},
  ];
  return(
    <section className="innerPage">
      <PageHdr step="E" title="Expert Connect" sub="Get professional advice from agricultural experts near you." icon={<Users size={26}/>}/>
      <div className="expertsGrid">
        {experts.map(e=>(
          <div key={e.name} className="expertCard">
            <div className="expAva"><User size={34}/></div>
            <div className="expInfo">
              <h3>{e.name}</h3>
              <p className="expSpec">{e.spec}</p>
              <div className="expMeta">
                <span><MapPin size={12}/>{e.area}</span>
                <span><Star size={12}/>{e.rating}</span>
                <span><Clock size={12}/>{e.exp}</span>
              </div>
              <span className={`avail ${e.available?"yes":"no"}`}>{e.available?"● Available":"● Busy"}</span>
            </div>
            <button className="primaryBtn sm" disabled={!e.available}><MessageCircle size={14}/> Contact</button>
          </div>
        ))}
      </div>
      <div className="emergBox">
        <AlertTriangle size={22}/>
        <div><b>Emergency Crop Help</b><p>24/7 helpline for urgent crop crisis situations across Bangladesh.</p></div>
        <a href="tel:+8809611234567" className="primaryBtn">📞 Call Now</a>
      </div>
    </section>
  );
}

// ── Weather ────────────────────────────────────────────────────────────────────
function WeatherPage({go,t}){
  const defaultWx={location:"Dhaka, Bangladesh",source:"Open-Meteo",current:{temperature:28,humidity:87,wind_speed:12,rainfall:14,rain_probability:48,uv_index:7,weather:"Partly Cloudy",time:"Loading live weather..."},risks:[["Late Blight","High","Potato, Tomato","red"],["Powdery Mildew","Moderate","Grape, Squash","orange"],["Bacterial Spot","Low","Pepper, Tomato","green"],["Leaf Blight Risk","Moderate","Corn, Grape","orange"]].map(([d,r,c,col])=>({disease:d,risk:r,crops:c,color:col,score:r==="High"?82:r==="Moderate"?56:28}))};
  const [wx,setWx]=useState(defaultWx);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const locations=[
    {name:"Dhaka, Bangladesh",lat:23.8103,lon:90.4125},
    {name:"Chattogram, Bangladesh",lat:22.3569,lon:91.7832},
    {name:"Sylhet, Bangladesh",lat:24.8949,lon:91.8687},
    {name:"Rajshahi, Bangladesh",lat:24.3745,lon:88.6042},
    {name:"Khulna, Bangladesh",lat:22.8456,lon:89.5403},
    {name:"Barishal, Bangladesh",lat:22.7010,lon:90.3535},
    {name:"Rangpur, Bangladesh",lat:25.7439,lon:89.2752},
    {name:"Mymensingh, Bangladesh",lat:24.7471,lon:90.4203},
  ];
  async function loadWeather(lat=23.8103,lon=90.4125,location="Dhaka, Bangladesh"){
    setLoading(true);setErr("");
    try{
      const res=await fetch(`${API}/api/weather?lat=${lat}&lon=${lon}&location=${encodeURIComponent(location)}`);
      const data=await res.json();
      if(!res.ok) throw new Error(data.detail||"Weather API failed");
      setWx(data);
    }catch(e){setErr(e.message||"Weather API failed");}
    setLoading(false);
  }
  function useMyLocation(){
    if(!navigator.geolocation){setErr("Geolocation is not supported by this browser.");return;}
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos=>loadWeather(pos.coords.latitude,pos.coords.longitude,"Your location"),
      ()=>{setErr("Location permission denied. Showing Dhaka weather.");setLoading(false);},
      {enableHighAccuracy:true,timeout:8000}
    );
  }
  useEffect(()=>{loadWeather()},[]);
  const c=wx.current||defaultWx.current;
  const risks=wx.risks||defaultWx.risks;
  return(
    <section className="innerPage">
      <PageHdr step="W" title="Weather & Disease Risk" sub="Real-time weather-based disease risk for your crops." icon={<Cloud size={26}/>}/>
      <div className="weatherCard pageCard liveWeatherCard">
        <div className="weatherActions">
          <span className="livePill"><Activity size={13}/> {wx.cached?"Cached data":"Live data"} · {wx.source||"Open-Meteo"}</span>
          <select className="wxSelect" onChange={e=>{const loc=locations.find(x=>x.name===e.target.value); if(loc) loadWeather(loc.lat,loc.lon,loc.name)}} defaultValue="Dhaka, Bangladesh">{locations.map(loc=><option key={loc.name} value={loc.name}>{loc.name}</option>)}</select>
          <button className="outlineBtn sm" onClick={()=>loadWeather()} disabled={loading}><RefreshCw size={14} className={loading?"spin":""}/> Refresh</button>
          <button className="primaryBtn sm" onClick={useMyLocation} disabled={loading}><MapPin size={14}/> Use my location</button>
        </div>
        {err&&<div className="notice wxNotice"><span>⚠️ {err}</span><button onClick={()=>setErr("")}><X size={14}/></button></div>}
        {wx.warning&&<div className="notice wxNotice"><span>⚠️ {wx.warning}</span><button onClick={()=>setWx({...wx,warning:""})}><X size={14}/></button></div>}
        <div className="wxMain">
          <div className="wxNow"><ThermometerSun size={52} className="wxIco"/><div><div className="tempBig">{c.temperature}°C</div><p>{c.weather} · {wx.location}</p><small>{c.time}</small></div></div>
          <div className="wxStats">
            {[[<Droplets/>, "Humidity",`${c.humidity}%`,Number(c.humidity)>=80],[<Wind/>,"Wind",`${c.wind_speed} km/h`,false],[<ThermometerSun/>,"UV Index",`${c.uv_index}`,Number(c.uv_index)>=7],[<Cloud/>,"Rainfall",`${c.rainfall}mm`,Number(c.rainfall)>=10],[<Cloud/>,"Rain Chance",`${c.rain_probability||0}%`,Number(c.rain_probability)>=60]].map(([ico,l,v,alert])=>(
              <div key={l} className={`wStat${alert?" wAlert":""}`}>{ico}<div><small>{l}</small><b>{v}</b></div></div>
            ))}
          </div>
        </div>
        <div className="riskPanel">
          <h3><AlertTriangle size={17}/> Disease Risk Today</h3>
          <div className="riskGrid">
            {risks.map(r=>(
              <div key={r.disease} className={`riskCard rc-${r.color}`}><div className={`riskLvl rl-${r.color}`}>{r.risk}</div><b>{r.disease}</b><p>{r.crops}</p><div className="riskMeter"><span style={{width:`${r.score||0}%`}}/></div></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Admin ──────────────────────────────────────────────────────────────────────
function AdminPage({items,go,t,lang="en"}){
  const total=items.length;
  const high=items.filter(i=>String(i.severity||"").toLowerCase()==="high").length;
  const avg=total?Math.round(items.reduce((s,i)=>s+Number(i.confidence||0),0)/total*10)/10:0;
  return(
    <section className="innerPage">
      <PageHdr step="A" title="Admin Dashboard" sub="System overview, user management, and analytics." icon={<Shield size={26}/>}/>
      <div className="dash4">
        {[{icon:<Users/>,l:"Stored Users",v:"SQLite",tr:"Real DB auth",c:"green"},
          {icon:<ScanLine/>,l:"Total Scans",v:String(total),tr:"From DB/history",c:"blue"},
          {icon:<AlertTriangle/>,l:"High Severity",v:String(high),tr:"Needs attention",c:"purple"},
          {icon:<Activity/>,l:"Avg Confidence",v:`${avg}%`,tr:"Calculated",c:"teal"}
        ].map(d=>(
          <div key={d.l} className={`dCard dc-${d.c}`}>
            <div className="dIco">{d.icon}</div>
            <div><small>{d.l}</small><b>{d.v}</b><span className="dTr">{d.tr}</span></div>
          </div>
        ))}
      </div>
      <div className="adminNote"><Shield size={16}/> Admin metrics now read from the same scan history used by the dashboard.</div>
      <HistTable items={items} lang={lang}/>
    </section>
  );
}

// ── Camera Modal ───────────────────────────────────────────────────────────────
function CameraModal({videoRef,canvasRef,capture,stop}){
  return(
    <div className="camOverlay">
      <div className="camBox pageCard">
        <div className="camHead"><h2><Camera size={18}/> Camera Capture</h2><button className="iconBtn" onClick={stop}><X size={19}/></button></div>
        <video ref={videoRef} autoPlay playsInline className="camVideo"/>
        <canvas ref={canvasRef} hidden/>
        <div className="camActions">
          <button className="ghostBtn" onClick={stop}>Cancel</button>
          <button className="primaryBtn" onClick={capture}><Camera size={17}/> Capture Photo</button>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
