# Configuració de Cloud Functions (Email Automàtic)

Per enviar un correu quan s'afegeixi un llibre nou, seguirem aquests passos.

### 1. Inicialitzar Functions
Al teu terminal, dins la carpeta del projecte, executa:
```bash
firebase init functions
```
- Tria el teu projecte de Firebase.
- Selecciona **JavaScript** o **TypeScript**.
- Instal·la les dependències quan t'ho pregunti.

### 2. Instal·lar Nodemailer
Necessitem una llibreria per enviar correus. Entra a la carpeta `functions/` i instal·la:
```bash
cd functions
npm install nodemailer
```

### 3. El Codi de la Funció
Obre el fitxer `functions/index.js` i posa-hi aquest codi:

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configura el teu transport de correu (Exemple amb Gmail)
// NOTA: Per a Gmail necessitaràs una "App Password"
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "EL_TEU_CORREU@gmail.com",
    pass: "LA_TEVA_APP_PASSWORD",
  },
});

exports.enviarMailNouLlibre = functions.firestore
  .document("estanteria/{libroId}")
  .onCreate((snap, context) => {
    const nouLlibre = snap.data();

    const mailOptions = {
      from: "L'estanteriapp <EL_TEU_CORREU@gmail.com>",
      to: "L_ALTRE_PERSONA@gmail.com", // El correu de la teva parella de biblioteca
      subject: `📖 Nou llibre a l'estanteria: ${nouLlibre.titol}`,
      html: `
        <h1 style="color: #E63946;">S'ha afegit un nou llibre!</h1>
        <p><strong>Títol:</strong> ${nouLlibre.titol}</p>
        <p><strong>Afegit per:</strong> ${nouLlibre.autor}</p>
        <p><strong>Comentari:</strong> ${nouLlibre.comentari}</p>
        <br>
        <a href="${nouLlibre.enllac}" style="background: black; color: white; padding: 10px; text-decoration: none;">Veure enllaç</a>
      `,
    };

    return transporter.sendMail(mailOptions);
  });
```

### 4. Desplegar
Torna a l'arrel del projecte i puja la funció al núvol:
```bash
firebase deploy --only functions
```

> [!TIP]
> Si no vols configurar un servidor SMTP propi, Firebase té una extensió anomenada **"Trigger Email from Firestore"** que és molt fàcil de configurar des de la consola i no requereix escriure gairebé gens de codi.
