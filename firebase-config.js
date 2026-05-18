// Firebase Setup
const firebaseConfig = {
  apiKey: "AIzaSyCHu_kQ9p32e4NJxl2JQAQvGFCwuTvUEMs",
  authDomain: "nexus-1fb1d.firebaseapp.com",
  projectId: "nexus-1fb1d",
  storageBucket: "nexus-1fb1d.firebasestorage.app",
  messagingSenderId: "696333426362",
  appId: "1:696333426362:web:01ab1620d8a73ca65a2c83",
  measurementId: "G-KLWJ1Y082X"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
