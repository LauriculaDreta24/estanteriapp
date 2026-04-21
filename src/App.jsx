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
import { LogOut, Plus, Link as LinkIcon, MessageSquare, Tag, Search } from 'lucide-react';

// Component per a la previsualització d'enllaços fent servir Microlink
const LinkPreview = ({ url }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success') {
          setData(json.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) return <div className="link-preview-card" style={{ padding: '1rem', fontSize: '0.8rem' }}>Carregant vista prèvia...</div>;
  if (!data) return null;

  return (
    <a href={url} target="_blank" rel="noreferrer" className="link-preview-card">
      {data.image && <img src={data.image.url} alt={data.title} className="link-preview-image" />}
      <div className="link-preview-info">
        <div className="link-preview-title">{data.title}</div>
        {data.description && <div className="link-preview-desc">{data.description}</div>}
      </div>
    </a>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
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

    // Lògica per separar etiquetes per comes i netejar espais
    const tagsArray = formData.etiquetes
      ? formData.etiquetes.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '')
      : [];

    try {
      await addDoc(collection(db, 'estanteria'), {
        titol: formData.titol,
        enllac: formData.enllac,
        comentari: formData.comentari,
        etiquetes: tagsArray, // Guardem com a array per facilitar cerques futures
        etiquetesRaw: formData.etiquetes, // Guardem el text original per al filtre simple
        autor: user.displayName,
        creadorEmail: user.email,
        creatEn: serverTimestamp()
      });
      setFormData({ titol: '', enllac: '', comentari: '', etiquetes: '' });
    } catch (error) {
      console.error("Error afegint document: ", error);
    }
  };

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    const matchesTitle = item.titol.toLowerCase().includes(search);
    const matchesTags = item.etiquetesRaw?.toLowerCase().includes(search) || 
                       (Array.isArray(item.etiquetes) && item.etiquetes.some(t => t.includes(search)));
    return matchesTitle || matchesTags;
  });

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
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Cerca per títol o etiquetes..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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

        <section className="form-card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="form-label-book">Títol de l'Entrada</div>
              <input 
                type="text" 
                className="form-title-input"
                placeholder="Escriu el títol aquí..."
                value={formData.titol}
                onChange={(e) => setFormData({...formData, titol: e.target.value})}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <div className="form-label-book">Autor</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', padding: '0.5rem 0', borderBottom: '1px solid black' }}>
                  {user.displayName}
                </div>
              </div>
              <div className="form-group">
                <div className="form-label-book">Enllaç Opcional</div>
                <input 
                  type="url" 
                  style={{ border: 'none', borderBottom: '1px solid black', padding: '0.5rem 0' }}
                  placeholder="https://..." 
                  value={formData.enllac}
                  onChange={(e) => setFormData({...formData, enllac: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-book">Comentari i Notes</div>
              <textarea 
                rows="6" 
                style={{ border: '2px solid black', padding: '1rem', background: 'white', fontSize: '1.1rem' }}
                placeholder="Ressenya, notes o fragments destacats..."
                value={formData.comentari}
                onChange={(e) => setFormData({...formData, comentari: e.target.value})}
              ></textarea>
            </div>

            <div className="form-group">
              <div className="form-label-book">Etiquetes (separades per comes)</div>
              <input 
                type="text" 
                style={{ border: 'none', borderBottom: '1px solid black', padding: '0.5rem 0' }}
                placeholder="Ex: historia, cuina, recomanat" 
                value={formData.etiquetes}
                onChange={(e) => setFormData({...formData, etiquetes: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-blackie" style={{ marginTop: '1rem' }}>Desar a l'Estanteria</button>
          </form>
        </section>

        <section style={{ marginTop: '6rem' }}>
          <h3 className="label-thin" style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>
            {searchTerm ? `Resultats per "${searchTerm}"` : 'Entrades Recents'}
          </h3>
          <div style={{ display: 'grid', gap: '3rem' }}>
            {filteredItems.map(item => (
              <div key={item.id} style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <div className="form-label-book" style={{ marginBottom: '0.5rem' }}>Afegit per {item.autor}</div>
                <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', lineHeight: '1', marginBottom: '1rem' }}>{item.titol}</h4>
                
                <p style={{ fontSize: '1.1rem', whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{item.comentari}</p>
                
                {item.enllac && <LinkPreview url={item.enllac} />}

                <div style={{ marginTop: '1rem' }}>
                  {Array.isArray(item.etiquetes) ? item.etiquetes.map((tag, i) => (
                    <span key={i} className="tag-badge">#{tag}</span>
                  )) : item.etiquetesRaw?.split(',').map((tag, i) => (
                    <span key={i} className="tag-badge">#{tag.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5 }}>No s'ha trobat cap entrada.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
