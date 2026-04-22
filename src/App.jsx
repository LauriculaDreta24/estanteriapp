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
  serverTimestamp,
  where,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase/config';
import { LogOut, Plus, Link as LinkIcon, MessageSquare, Tag, Search, Book, X, ChevronLeft, ChevronRight, Edit2, Trash2, Settings, Library } from 'lucide-react';

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
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModal, setActiveModal] = useState(null); // 'addPage', 'addBook', 'viewBook', 'viewFull'
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTurningPage, setIsTurningPage] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  const [editingItem, setEditingItem] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [formData, setFormData] = useState({
    titol: '',
    enllac: '',
    comentari: '',
    etiquetes: '',
    categoriaId: ''
  });

  const [bookFormData, setBookFormData] = useState({
    nom: '',
    color: 'hsl(0, 80%, 55%)',
    hue: 0
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
      // Listener per a categories (llibres)
      const qCats = query(collection(db, 'categories'), orderBy('creatEn', 'asc'));
      const unsubCats = onSnapshot(qCats, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      // Listener per a totes les entrades
      const qItems = query(collection(db, 'estanteria'), orderBy('creatEn', 'desc'));
      const unsubItems = onSnapshot(qItems, (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unsubCats(); unsubItems(); };
    }
  }, [user]);

  // Tancar recomanacions en clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowRecommendations(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  const handleSubmitPage = async (e) => {
    e.preventDefault();
    if (!formData.titol || !formData.categoriaId || isSubmitting) return;

    setIsSubmitting(true);
    const tagsArray = formData.etiquetes
      ? formData.etiquetes.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '')
      : [];

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'estanteria', editingItem.id), {
          ...formData,
          etiquetes: tagsArray,
          etiquetesRaw: formData.etiquetes
        });
      } else {
        await addDoc(collection(db, 'estanteria'), {
          ...formData,
          etiquetes: tagsArray,
          etiquetesRaw: formData.etiquetes,
          autor: user.displayName,
          creadorEmail: user.email,
          creatEn: serverTimestamp()
        });
      }
      setFormData({ titol: '', enllac: '', comentari: '', etiquetes: '', categoriaId: '' });
      setEditingItem(null);
      setActiveModal(null);
    } catch (error) {
      console.error("Error processant pàgina: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBook = async (e) => {
    e.preventDefault();
    if (!bookFormData.nom || isSubmitting) return;

    // Comprovar si ja existeix un llibre amb aquest nom (ignorant majúscules/minúscules)
    const exists = categories.some(cat => 
      cat.nom.toLowerCase().trim() === bookFormData.nom.toLowerCase().trim() && 
      (!editingBook || cat.id !== editingBook.id)
    );

    if (exists) {
      alert(`Ja existeix un llibre amb el nom "${bookFormData.nom}". Tria un nom diferent.`);
      return;
    }

    setIsSubmitting(true);
    const dataToSave = { ...bookFormData };
    const isEditing = !!editingBook;
    const bookId = editingBook?.id;

    // Tanquem el modal immediatament per millorar la sensació de velocitat
    setActiveModal(null);

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'categories', bookId), dataToSave);
      } else {
        await addDoc(collection(db, 'categories'), {
          ...dataToSave,
          autor: user.displayName,
          creadorEmail: user.email,
          creatEn: serverTimestamp()
        });
      }
      setBookFormData({ nom: '', color: '#E63946' });
      setEditingBook(null);
    } catch (error) {
      console.error("Error processant llibre: ", error);
      alert("S'ha produït un error al desar el llibre.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePage = async (id) => {
    if (window.confirm("Segur que vols eliminar aquesta pàgina?")) {
      try {
        await deleteDoc(doc(db, 'estanteria', id));
        if (currentPage >= bookItems.length - 1 && currentPage > 0) {
          setCurrentPage(currentPage - 1);
        }
      } catch (error) {
        console.error("Error eliminant pàgina:", error);
      }
    }
  };

  const startEditPage = (item) => {
    setEditingItem(item);
    setFormData({
      titol: item.titol,
      enllac: item.enllac || '',
      comentari: item.comentari || '',
      etiquetes: item.etiquetesRaw || item.etiquetes?.join(', ') || '',
      categoriaId: item.categoriaId
    });
    setActiveModal('addPage');
  };

  const startEditBook = (book) => {
    setEditingBook(book);
    // Intentem extreure el hue si és un HSL, si no posem 0
    const hueMatch = book.color?.match(/hsl\((\d+)/);
    const hue = hueMatch ? parseInt(hueMatch[1]) : 0;
    
    setBookFormData({
      nom: book.nom,
      color: book.color || 'hsl(0, 80%, 55%)',
      hue: hue
    });
    setActiveModal('addBook');
  };

  const deleteBook = async (book) => {
    if (window.confirm(`Segur que vols eliminar el llibre "${book.nom}"? Això no eliminarà les pàgines, però quedaran orfes.`)) {
      try {
        await deleteDoc(doc(db, 'categories', book.id));
        setActiveModal(null);
      } catch (error) {
        console.error("Error eliminant llibre:", error);
      }
    }
  };

  const openBook = (category) => {
    setSelectedBook(category);
    setCurrentPage(0);
    setActiveModal('viewBook');
  };

  const openAddPageForBook = (bookId) => {
    setFormData({
      titol: '',
      enllac: '',
      comentari: '',
      etiquetes: '',
      categoriaId: bookId
    });
    setActiveModal('addPage');
  };

  const nextPage = () => {
    const step = isMobile ? 1 : 2;
    if (currentPage + step < bookItems.length) {
      setIsTurningPage(true);
      setTimeout(() => {
        setCurrentPage(prev => prev + step);
        setIsTurningPage(false);
      }, 400);
    }
  };

  const prevPage = () => {
    const step = isMobile ? 1 : 2;
    if (currentPage > 0) {
      setIsTurningPage(true);
      setTimeout(() => {
        setCurrentPage(prev => Math.max(0, prev - step));
        setIsTurningPage(false);
      }, 400);
    }
  };

  const filteredCategories = categories.filter(cat => {
    if (!cat || !cat.id) return false;
    const term = (searchTerm || '').toLowerCase().trim();
    const termNoHash = term.startsWith('#') ? term.substring(1) : term;
    
    const matches = (val) => {
      if (val === undefined || val === null) return false;
      const str = String(val).toLowerCase();
      return (term && str.includes(term)) || (termNoHash && str.includes(termNoHash));
    };

    const matchesName = matches(cat.nom);
    const hasMatchingPages = Array.isArray(items) && items.some(item => {
      if (!item) return false;
      const isBookPage = (item.categoryId === cat.id || item.categoriaId === cat.id);
      if (!isBookPage) return false;

      const matchesTitle = matches(item.titol);
      const matchesComment = matches(item.comentari);
      const matchesTags = matches(item.etiquetesRaw) || 
                         (Array.isArray(item.etiquetes) && item.etiquetes.some(t => matches(t)));
      
      return matchesTitle || matchesComment || matchesTags;
    });
    return matchesName || hasMatchingPages;
  });

  const bookItems = selectedBook ? items.filter(item => item.categoriaId === selectedBook.id) : [];

  if (loading) return <div className="login-overlay">Carregant...</div>;

  if (!user) {
    return (
      <div className="login-overlay">
        <div className="label-thin" style={{ color: 'white', opacity: 0.6 }}>BIBLIOTECA</div>
        <div className="login-logo">Estanteriapp</div>
        <button className="btn-blackie" style={{ background: 'white', color: 'black', width: 'auto', padding: '1rem 3rem' }} onClick={handleLogin}>
          Entra amb Google
        </button>
      </div>
    );
  }

  return (
    <div className="blackie-container">
      <header className="header-red" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 5vw', position: 'relative' }}>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div className="label-thin" style={{ color: 'white', opacity: 0.8, letterSpacing: '4px', fontSize: '1.2rem', marginBottom: '0rem' }}>
            BIBLIOTECA
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', color: 'white', margin: '0', fontWeight: 'normal', lineHeight: '1' }}>
            Estanteriapp
          </h1>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div className="icon-top" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             {/* Només dos llibres */}
             <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', paddingBottom: '5px' }}>
                {/* Llibre 1: Alt i recte (Esquerra) */}
                <div style={{ width: '22px', height: '90px', background: 'white', borderRadius: '2px', position: 'relative' }}>
                   <div style={{ position: 'absolute', top: '8px', left: '4px', right: '4px', height: '12px', background: 'rgba(0,0,0,0.1)' }}></div>
                </div>

                {/* Llibre 2: Més petit i inclinat a l'esquerra (Dreta, recolzant-se) */}
                <div style={{ 
                   width: '20px', 
                   height: '70px', 
                   background: 'white', 
                   borderRadius: '2px', 
                   transform: 'rotate(-10deg)', 
                   transformOrigin: 'bottom left', 
                   position: 'relative'
                }}>
                   <div style={{ position: 'absolute', top: '6px', left: '3px', right: '3px', height: '8px', background: 'rgba(0,0,0,0.1)' }}></div>
                </div>
             </div>

             {/* Estanteria amb suports */}
             <div style={{ width: '100px', height: '6px', background: 'white', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '6px', left: '20px', width: '12px', height: '8px', background: 'white' }}></div>
                <div style={{ position: 'absolute', top: '6px', right: '20px', width: '12px', height: '8px', background: 'white' }}></div>
             </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn-action" style={{ background: 'white', color: 'black' }} onClick={() => setActiveModal('addBook')}>
            <Plus size={16} style={{ marginRight: '5px' }} /> Llibre
          </button>
          <button className="btn-action" style={{ background: 'white', color: 'black' }} onClick={() => setActiveModal('addPage')}>
            <Plus size={16} style={{ marginRight: '5px' }} /> Pàgina
          </button>
          <button 
            onClick={() => {
              setSearchTerm('');
              setActiveModal(null);
              setSelectedBook(null);
            }} 
            className="btn-action" 
            style={{ background: 'transparent', color: 'white', border: '1px solid white', boxShadow: 'none', padding: '0.6rem' }}
            title="Inici"
          >
            <Library size={16} />
          </button>
          <button onClick={handleLogout} className="btn-action" style={{ background: 'transparent', color: 'white', border: '1px solid white', boxShadow: 'none', padding: '0.6rem' }}>
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="bookshelf-container">
        <div className="search-container" style={{ marginBottom: '3rem', borderBottom: 'none', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Cerca un llibre o contingut..." 
              value={searchTerm}
              onFocus={() => setShowRecommendations(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowRecommendations(true);
              }}
            />
            {searchTerm && showRecommendations && (
              <div className="search-recommendations">
                {items.filter(item => {
                  if (!item) return false;
                  const term = searchTerm.toLowerCase().trim();
                  const termNoHash = term.startsWith('#') ? term.substring(1) : term;
                  const matches = (val) => {
                    if (val === undefined || val === null) return false;
                    const str = String(val).toLowerCase();
                    return (term && str.includes(term)) || (termNoHash && str.includes(termNoHash));
                  };

                  const cat = categories.find(c => c.id === item.categoryId || c.id === item.categoriaId);
                  if (!cat) return false;

                  return matches(item.titol) || 
                         matches(item.etiquetesRaw) || 
                         (Array.isArray(item.etiquetes) && item.etiquetes.some(t => matches(t))) ||
                         matches(item.comentari);
                }).slice(0, 5).map(item => {
                  const cat = categories.find(c => c.id === item.categoryId || c.id === item.categoriaId);
                  return (
                    <div key={item.id} className="recommendation-item" onClick={() => {
                      if (cat) {
                        const bookPages = items.filter(i => (i.categoryId || i.categoriaId) === cat.id);
                        const pageIdx = bookPages.findIndex(i => i.id === item.id);
                        openBook(cat);
                        setCurrentPage(Math.floor(pageIdx / 2) * 2);
                        setSearchTerm('');
                      }
                    }}>
                      <div className="form-label-book">{String(cat?.nom || 'Sense Llibre')}</div>
                      <div style={{ fontWeight: 'bold' }}>{String(item.titol || '')}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '2px' }}>
                        {String(item.comentari || '').substring(0, 60)}...
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {searchTerm ? (
          <section style={{ marginTop: '2rem' }}>
            <h3 className="label-thin" style={{ fontSize: '1.5rem', marginBottom: '2rem', borderBottom: '2px solid black', paddingBottom: '0.5rem' }}>
              Resultats per "{searchTerm}"
            </h3>
            <div style={{ display: 'grid', gap: '3rem' }}>
              {(() => {
                try {
                  const term = searchTerm.toLowerCase().trim();
                  const termNoHash = term.startsWith('#') ? term.substring(1) : term;
                  const matches = (val) => {
                    if (val === undefined || val === null) return false;
                    const str = String(val).toLowerCase();
                    return (term && str.includes(term)) || (termNoHash && str.includes(termNoHash));
                  };

                  const results = items.filter(item => {
                    if (!item) return false;
                    const cat = categories.find(c => c.id === item.categoryId || c.id === item.categoriaId);
                    if (!cat) return false;

                    const matchesTitle = matches(item.titol);
                    const matchesTags = matches(item.etiquetesRaw) || 
                                       (Array.isArray(item.etiquetes) && item.etiquetes.some(t => matches(t)));
                    const matchesComment = matches(item.comentari);
                    return matchesTitle || matchesTags || matchesComment;
                  });

                  if (results.length === 0) {
                    return <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No s'ha trobat cap pàgina amb aquest contingut.</div>;
                  }

                  return results.map(item => (
                  <div key={item.id} className="search-result-item" onClick={() => {
                    const cat = categories.find(c => c.id === item.categoryId || c.id === item.categoriaId);
                    if (cat) {
                      const bookPages = items.filter(i => (i.categoryId || i.categoriaId) === cat.id);
                      const pageIdx = bookPages.findIndex(i => i.id === item.id);
                      openBook(cat);
                      setCurrentPage(pageIdx >= 0 ? pageIdx : 0);
                    }
                  }} style={{ cursor: 'pointer', padding: '1.5rem', border: '2px solid black', background: 'white', boxShadow: '6px 6px 0px black' }}>
                    <div className="form-label-book" style={{ marginBottom: '0.5rem' }}>
                      {String(categories.find(c => c.id === item.categoryId || c.id === item.categoriaId)?.nom || 'Sense Llibre')}
                    </div>
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', lineHeight: '1', marginBottom: '1rem', color: 'var(--color-vermeil)' }}>
                      {String(item.titol || '')}
                    </h4>
                    <p style={{ fontSize: '1rem', opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {String(item.comentari || '')}
                    </p>
                    <div style={{ marginTop: '1rem' }}>
                      {Array.isArray(item.etiquetes) && item.etiquetes.map((tag, i) => (
                        <span key={i} className="tag-badge">#{String(tag)}</span>
                      ))}
                    </div>
                  </div>
                  ));
                } catch (e) {
                  console.error("Error en el filtratge: ", e);
                  return <div style={{ color: 'red', padding: '2rem' }}>Error al processar la cerca.</div>;
                }
              })()}
            </div>
          </section>
        ) : (
          <>
            {Array.from({ length: Math.ceil(categories.length / 8) || 1 }).map((_, shelfIndex) => (
              <div key={shelfIndex} className="shelf">
                {categories.slice(shelfIndex * 8, (shelfIndex + 1) * 8).map(cat => (
                  <div 
                    key={cat.id} 
                    className="book-spine" 
                    style={{ backgroundColor: cat.color || '#E63946' }}
                    onClick={() => openBook(cat)}
                  >
                    <span className="book-title-spine">{cat.nom}</span>
                  </div>
                ))}
                {categories.length === 0 && shelfIndex === 0 && (
                  <p style={{ position: 'absolute', width: '100%', textAlign: 'center', opacity: 0.3 }}>
                    L'estanteria està buida.
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </main>

      {/* Modal Afegir/Editar Llibre */}
      {activeModal === 'addBook' && (
        <div className="floating-form-overlay">
          <button className="btn-close" onClick={() => { setActiveModal(null); setEditingBook(null); }}><X /></button>
          <div className="main-content">
            <h2 className="title-bold" style={{ fontSize: '3rem', marginBottom: '2rem' }}>
              {editingBook ? 'Editar Llibre' : 'Nou Llibre'}
            </h2>
            <form onSubmit={handleSubmitBook}>
              <div className="form-group">
                <div className="form-label-book">Nom de la Temàtica</div>
                <input 
                  type="text" 
                  className="form-title-input" 
                  placeholder="Ex: Història, Receptes, Ciència..." 
                  value={bookFormData.nom}
                  onChange={(e) => setBookFormData({...bookFormData, nom: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <div className="form-label-book">Tria el Matís (Només colors pastel)</div>
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  className="hue-slider"
                  value={bookFormData.hue}
                  onChange={(e) => {
                    const hue = e.target.value;
                    const vibrantColor = `hsl(${hue}, 80%, 55%)`;
                    setBookFormData({...bookFormData, hue: hue, color: vibrantColor});
                  }}
                />
                <div 
                  className="color-preview-box" 
                  style={{ backgroundColor: bookFormData.color }}
                ></div>
              </div>
              <button type="submit" className="btn-blackie" style={{ marginTop: '2rem' }} disabled={isSubmitting}>
                {isSubmitting ? 'Processant...' : (editingBook ? 'Guardar Canvis' : 'Crear Llibre')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Afegir/Editar Pàgina */}
      {activeModal === 'addPage' && (
        <div className="floating-form-overlay">
          <button className="btn-close" onClick={() => { setActiveModal(null); setEditingItem(null); }}><X /></button>
          <div className="main-content">
            <h2 className="title-bold" style={{ fontSize: '3rem', marginBottom: '2rem' }}>
              {editingItem ? 'Editar Pàgina' : 'Nova Pàgina'}
            </h2>
            <form onSubmit={handleSubmitPage}>
              <div className="form-group">
                <div className="form-label-book">Categoria (Llibre)</div>
                <select 
                  style={{ width: '100%', padding: '1rem', border: 'none', borderBottom: '2px solid black', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: '1.2rem', outline: 'none' }}
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({...formData, categoriaId: e.target.value})}
                  required
                >
                  <option value="">Selecciona un llibre...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nom}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginTop: '2rem' }}>
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
                    className="form-serif-input"
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
                  style={{ border: '2px solid black', padding: '1rem', background: 'white', fontSize: '1.1rem', width: '100%', fontFamily: 'var(--font-sans)' }}
                  placeholder="Ressenya, notes o fragments destacats..."
                  value={formData.comentari}
                  onChange={(e) => setFormData({...formData, comentari: e.target.value})}
                ></textarea>
              </div>

              <div className="form-group">
                <div className="form-label-book">Etiquetes (separades per comes)</div>
                <input 
                  type="text" 
                  className="form-serif-input"
                  placeholder="Ex: historia, cuina, recomanat" 
                  value={formData.etiquetes}
                  onChange={(e) => setFormData({...formData, etiquetes: e.target.value})}
                />
              </div>

              <button type="submit" className="btn-blackie" style={{ marginTop: '1rem' }} disabled={isSubmitting}>
                {isSubmitting ? 'Processant...' : 'Desar a l\'Estanteria'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Viewer de Llibre Obert (Double Page) */}
      {activeModal === 'viewBook' && selectedBook && (
        <div className="book-modal-overlay">
          <button className="btn-close" style={{ color: 'white', zIndex: 2000 }} onClick={() => setActiveModal(null)}><X /></button>
          
          <div className="book-container-3d">
                <button 
                  className="btn-nav-side btn-nav-left"
                  disabled={currentPage === 0}
                  onClick={prevPage}
                >
                  <ChevronLeft size={40} />
                </button>

                <button 
                  className="btn-nav-side btn-nav-right"
                  disabled={isMobile ? currentPage + 1 >= bookItems.length : (currentPage + 2 >= bookItems.length && (bookItems.length % 2 === 0 || currentPage + 1 >= bookItems.length))}
                  onClick={nextPage}
                >
                  <ChevronRight size={40} />
                </button>

                <div className={`book-opened ${isTurningPage ? 'page-turning' : ''}`}>
                  <div className="book-spine-center"></div>
                  
                  {/* Pàgina Esquerra (Visible sempre en mòbil, o única pàgina) */}
                  <div className={`book-page-half ${isMobile ? 'mobile-visible' : ''}`}>
                    {/* Header persistent (Títol i Accions del Llibre) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <h1 className="book-viewer-title" style={{ fontSize: '1.8rem', flex: 1, border: 'none', margin: 0 }}>{selectedBook.nom}</h1>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                        <button className="btn-icon-tiny" onClick={() => startEditBook(selectedBook)}><Settings size={10} /> Editar Llibre</button>
                        <button className="btn-icon-tiny" style={{ marginTop: '0.4rem' }} onClick={() => deleteBook(selectedBook)}><Trash2 size={10} /> Eliminar Llibre</button>
                      </div>
                    </div>

                    {bookItems[currentPage] ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.5, marginBottom: '1rem' }}>
                          <span>Pàgina {currentPage + 1} de {bookItems.length}</span>
                          <span>{bookItems[currentPage].creatEn?.toDate().toLocaleString('ca-ES')}</span>
                        </div>

                        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', lineHeight: '1', marginBottom: '1rem' }}>{bookItems[currentPage].titol}</h2>
                        <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                          {String(bookItems[currentPage].comentari || '').length > 400 ? (
                            <>
                              {String(bookItems[currentPage].comentari || '').substring(0, 400)}
                              <span className="read-more-dots" onClick={() => { setSelectedItem(bookItems[currentPage]); setActiveModal('viewFull'); }}>...</span>
                            </>
                          ) : bookItems[currentPage].comentari}
                        </div>
                        {bookItems[currentPage].enllac && (
                          <div style={{ marginBottom: '1.5rem' }}>
                            <div className="form-label-book">Referència</div>
                            <LinkPreview url={bookItems[currentPage].enllac} />
                          </div>
                        )}
                        <div style={{ marginTop: '1.5rem' }}>
                          {bookItems[currentPage].etiquetes?.map((tag, i) => <span key={i} className="tag-badge">#{tag}</span>)}
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                          <button className="btn-icon-tiny" onClick={() => startEditPage(bookItems[currentPage])}><Edit2 size={12} /> Editar</button>
                          <button className="btn-icon-tiny" onClick={() => deletePage(bookItems[currentPage].id)}><Trash2 size={12} /> Eliminar</button>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 60px)', gap: '2rem' }}>
                         <div style={{ opacity: 0.1 }}><Book size={100} /></div>
                         <button 
                            className="btn-blackie" 
                            style={{ fontSize: '0.8rem', padding: '0.8rem 1.5rem' }}
                            onClick={() => openAddPageForBook(selectedBook.id)}
                         >
                            <Plus size={16} style={{ marginRight: '8px' }} /> Crear Pàgina
                         </button>
                      </div>
                    )}
                  </div>

                  {/* Pàgina Dreta (Només Desktop) */}
                  {!isMobile && (
                    <div className="book-page-half">
                      {bookItems[currentPage + 1] ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', opacity: 0.5, marginBottom: '1rem' }}>
                            <span>Pàgina {currentPage + 2} de {bookItems.length}</span>
                            <span>{bookItems[currentPage + 1].creatEn?.toDate().toLocaleString('ca-ES')}</span>
                          </div>
                          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', lineHeight: '1', marginBottom: '1rem' }}>{bookItems[currentPage + 1].titol}</h2>
                          <div style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            {String(bookItems[currentPage + 1].comentari || '').length > 400 ? (
                              <>
                                {String(bookItems[currentPage + 1].comentari || '').substring(0, 400)}
                                <span className="read-more-dots" onClick={() => { setSelectedItem(bookItems[currentPage + 1]); setActiveModal('viewFull'); }}>...</span>
                              </>
                            ) : bookItems[currentPage + 1].comentari}
                          </div>
                          {bookItems[currentPage + 1].enllac && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <div className="form-label-book">Referència</div>
                              <LinkPreview url={bookItems[currentPage + 1].enllac} />
                            </div>
                          )}
                          <div style={{ marginTop: '1.5rem' }}>
                            {bookItems[currentPage + 1].etiquetes?.map((tag, i) => <span key={i} className="tag-badge">#{tag}</span>)}
                          </div>
                          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn-icon-tiny" onClick={() => startEditPage(bookItems[currentPage + 1])}><Edit2 size={12} /> Editar</button>
                            <button className="btn-icon-tiny" onClick={() => deletePage(bookItems[currentPage + 1].id)}><Trash2 size={12} /> Eliminar</button>
                          </div>
                        </>
                      ) : (
                        <div style={{ opacity: 0.1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          {currentPage + 1 >= bookItems.length ? "Fi del llibre" : <Book size={100} />}
                        </div>
                      )}
                    </div>
                  )}
                </div>
          </div>
        </div>
      )}

      {/* Modal contingut complet */}
      {activeModal === 'viewFull' && selectedItem && (
        <div className="floating-form-overlay">
          <button className="btn-close" onClick={() => setActiveModal('viewBook')}><X /></button>
          <div className="main-content">
            <div className="form-label-book">{selectedItem.autor}</div>
            <h2 className="title-bold" style={{ fontSize: '3rem', marginBottom: '2rem' }}>{selectedItem.titol}</h2>
            <p style={{ fontSize: '1.2rem', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontFamily: 'var(--font-sans)' }}>
              {selectedItem.comentari}
            </p>
            {selectedItem.enllac && (
               <div style={{ marginTop: '2rem' }}>
                  <div className="form-label-book">Referència</div>
                  <LinkPreview url={selectedItem.enllac} />
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
