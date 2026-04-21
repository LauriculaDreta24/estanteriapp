import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase/config';
import { Book, LogOut, Plus, Link as LinkIcon, MessageSquare, Tag } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    titol: '',
    enllac: '',
    comentari: '',
    etiquetes: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'estanteria'), orderBy('creatEn', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(docs);
      });
      return unsubscribe;
    }
  }, [user]);

  const handleLogin = () => {
    signInWithPopup(auth, googleProvider).catch(error => {
      console.error("Error en el login:", error);
    });
  };

  const handleLogout = () => signOut(auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titol) return;

    try {
      await addDoc(collection(db, 'estanteria'), {
        titol: formData.titol,
        enllac: formData.enllac,
        comentari: formData.comentari,
        etiquetes: formData.etiquetes,
        autor: user.displayName, // Automàtic segons l'usuari
        creadorEmail: user.email,
        creatEn: serverTimestamp()
      });
      setFormData({ titol: '', enllac: '', comentari: '', etiquetes: '' });
      alert("S'ha afegit correctament a l'estanteria!");
    } catch (error) {
      console.error("Error afegint document: ", error);
    }
  };

  if (loading) {
    return <div className="login-overlay">Carregant...</div>;
  }

  if (!user) {
    return (
      <div className="login-overlay">
        <div className="label-thin" style={{ color: 'white', opacity: 0.6 }}>BIBLIOTECA</div>
        <div className="login-logo">L'estanteriapp</div>
        <button className="btn-blackie" style={{ background: 'white', color: 'black', width: 'auto', padding: '1rem 3rem' }} onClick={handleLogin}>
          Entra amb Google
        </button>
      </div>
    );
  }

  return (
    <div className="blackie-container">
      <header className="header-red">
        <div style={{ textAlign: 'center' }}>
          <div className="icon-top">
             <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 30C20 20 30 20 30 20H70C70 20 80 20 80 30V80H20V30Z" stroke="black" strokeWidth="4"/>
                <circle cx="40" cy="45" r="5" fill="black"/>
                <circle cx="60" cy="45" r="5" fill="black"/>
             </svg>
          </div>
          <button onClick={handleLogout} className="btn-blackie" style={{ position: 'absolute', top: '20px', right: '20px', width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Sortir
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="logo-container">
          <div className="label-thin">BIBLIOTECA</div>
          <div className="title-bold">Estanteriapp</div>
          <div className="year-thin">2026</div>
        </div>

        <section className="form-card">
          <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1.5rem', fontSize: '2rem' }}>Nova Entrada</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><Plus size={14} /> Títol del Llibre</label>
              <input 
                type="text" 
                placeholder="Ex: La societat de la neu" 
                value={formData.titol}
                onChange={(e) => setFormData({...formData, titol: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Autor (Propietari)</label>
              <input 
                type="text" 
                value={user.displayName}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label><LinkIcon size={14} /> Enllaç</label>
              <input 
                type="url" 
                placeholder="https://..." 
                value={formData.enllac}
                onChange={(e) => setFormData({...formData, enllac: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label><MessageSquare size={14} /> Comentari</label>
              <textarea 
                rows="4" 
                placeholder="Què t'ha semblat?"
                value={formData.comentari}
                onChange={(e) => setFormData({...formData, comentari: e.target.value})}
              ></textarea>
            </div>

            <div className="form-group">
              <label><Tag size={14} /> Etiquetes</label>
              <input 
                type="text" 
                placeholder="Ficció, Història, Recomanat..." 
                value={formData.etiquetes}
                onChange={(e) => setFormData({...formData, etiquetes: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-blackie">Afegir a la Biblioteca</button>
          </form>
        </section>

        <section style={{ marginTop: '4rem' }}>
          <h3 className="label-thin" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Recents</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.map(item => (
              <div key={item.id} style={{ borderLeft: '4px solid var(--color-vermeil)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>{item.titol}</h4>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', opacity: 0.6 }}>Afegit per: {item.autor}</p>
                <p style={{ marginTop: '0.5rem' }}>{item.comentari}</p>
                {item.enllac && <a href={item.enllac} target="_blank" rel="noreferrer" style={{ color: 'var(--color-vermeil)', fontSize: '0.8rem' }}>Veure més</a>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
