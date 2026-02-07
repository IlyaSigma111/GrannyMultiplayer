import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, update, remove } from 
    "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHKz6YuGSYzyO-Sj6IS93C9mV0yX0Yfbg",
    authDomain: "grannymultiplayer.firebaseapp.com",
    databaseURL: "https://grannymultiplayer-default-rtdb.firebaseio.com",
    projectId: "grannymultiplayer",
    storageBucket: "grannymultiplayer.firebasestorage.app",
    messagingSenderId: "678766098712",
    appId: "1:678766098712:web:5dd0ead1e54da25109866d"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database, ref, set, onValue, push, update, remove };
