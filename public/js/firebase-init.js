// public/js/firebase-init.js
// Modern Firebase v10 Modular SDK Initialization via Dynamic Config (Zero Hardcoded Keys)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let app = null;
let db = null;

async function initFirebase() {
    try {
        // Fetch config securely from serverless endpoint (populated from .env)
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error("Failed to load Firebase config from /api/config");
        
        const config = await res.json();
        if (!config.apiKey || !config.projectId) {
            console.warn("Firebase configuration keys are missing in environment variables.");
            return null;
        }

        app = initializeApp(config);
        db = getFirestore(app);
        console.log("🔥 Firebase Firestore connected successfully to project:", config.projectId);
        
        // Expose to window for modular page interaction
        window.salonDB = {
            db,
            collection,
            addDoc,
            getDocs,
            onSnapshot,
            doc,
            updateDoc,
            deleteDoc,
            query,
            orderBy,
            where,
            serverTimestamp
        };

        // Dispatch custom event when ready
        window.dispatchEvent(new CustomEvent('firebase-ready', { detail: { db } }));
        return db;
    } catch (err) {
        console.error("Firebase init error:", err);
        return null;
    }
}

// Auto-run on load
initFirebase();

export { db, initFirebase };
