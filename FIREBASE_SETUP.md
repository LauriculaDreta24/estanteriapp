# Configuración de Firebase para L'estanteriapp

Sigue estos pasos para conectar tu aplicación con la nube.

### 1. Crear el Proyecto
1. Ve a [Firebase Console](https://console.firebase.google.com/).
2. Haz clic en **"Añadir proyecto"**.
3. Ponle el nombre: `estanteriapp`.
4. (Opcional) Desactiva Google Analytics para este proyecto si quieres ir más rápido.

### 2. Configurar Authentication (Google Login)
1. En el menú lateral, ve a **Compilación > Authentication**.
2. Haz clic en **"Comenzar"**.
3. Ve a la pestaña **Sign-in method**.
4. Selecciona **Google** y actívalo (tendrás que poner tu email de soporte).

### 3. Crear la Base de Datos (Firestore)
1. En el menú lateral, ve a **Compilación > Firestore Database**.
2. Haz clic en **"Crear base de datos"**.
3. Elige la ubicación (por ejemplo, `eur3` en Europa).
4. Selecciona **"Comenzar en modo de prueba"** (luego lo podremos cambiar para mayor seguridad).

### 4. Registrar la App y obtener las claves
1. Vuelve a la página principal del proyecto (Información general).
2. Haz clic en el icono de **Web** (`</>`).
3. Registra la app con el nombre `estanteriapp-web`.
4. Te aparecerá un código llamado `firebaseConfig`. Copia ese objeto y pégamelo aquí en el chat para que yo mismo lo configure en tu proyecto.

Debería tener este formato:
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "estanteriapp.firebaseapp.com",
  projectId: "estanteriapp",
  storageBucket: "estanteriapp.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```
