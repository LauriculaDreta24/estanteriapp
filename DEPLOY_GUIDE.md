# Com compartir L'estanteriapp amb un amic

Actualment, l'aplicació només funciona al teu ordinador (**localhost**). Perquè el teu amic la pugui veure des de casa seva, hem de "pujar-la" a Internet fent servir **Firebase Hosting**.

### 1. Preparar l'aplicació
Primer, hem de crear la versió final de l'app. Executa això al teu terminal:
```bash
npm run build
```
Això crearà una carpeta anomenada `dist/`.

### 2. Configurar el Hosting (La primera vegada)
Executa aquesta comanda:
```bash
firebase init hosting
```
- **"What do you want to use as your public directory?"** Escriu: `dist`
- **"Configure as a single-page app (rewrite all urls to /index.html)?"** Escriu: `y` (sí)
- **"Set up automatic builds and deploys with GitHub?"** Escriu: `n` (no)

### 3. Publicar!
Un cop configurat, només has de fer:
```bash
firebase deploy --only hosting
```

### 🌍 El teu enllaç públic
Quan acabi el procés de `deploy`, Firebase et donarà un enllaç semblant a aquest:
`https://estanteriappbiblioteca.web.app`

**Aquest és l'enllaç que li hauràs d'enviar al teu amic!**

### ⚠️ Nota important sobre Google Login
Per defecte, qualsevol persona amb un compte de Google podrà entrar. Si vols que NOMÉS tu i el teu amic pugueu veure els llibres, m'ho dius i configurarem unes "Security Rules" a Firestore per bloquejar l'accés a tothom qui no siguin els vostres correus.
