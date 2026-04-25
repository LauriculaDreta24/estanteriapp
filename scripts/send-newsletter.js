const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Inicialitzar Firebase Admin amb les credencials del Secret de GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function sendNewsletter() {
  try {
    console.log('Iniciant procés de newsletter...');

    // 1. Obtenir les categories (llibres) per poder resoldre els noms
    const categoriesSnapshot = await db.collection('categories').get();
    const categories = {};
    categoriesSnapshot.forEach(doc => {
      categories[doc.id] = doc.data();
    });

    // 2. Obtenir les entrades de l'última setmana
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const itemsSnapshot = await db.collection('estanteria')
      .where('creatEn', '>', admin.firestore.Timestamp.fromDate(weekAgo))
      .orderBy('creatEn', 'desc')
      .get();

    const recentItems = [];
    itemsSnapshot.forEach(doc => {
      const data = doc.data();
      // Només incloure si té una categoria existent
      if (categories[data.categoriaId || data.categoryId]) {
        recentItems.push({ id: doc.id, ...data });
      }
    });

    if (recentItems.length === 0) {
      console.log('No hi ha novetats aquesta setmana. No s\'enviarà correu.');
      return;
    }

    console.log(`S'han trobat ${recentItems.length} novetats.`);

    // 3. Configurar el transport de correu
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'lauradb12@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // 4. Generar el contingut HTML de l'email
    const itemsHtml = recentItems.map(item => {
      const cat = categories[item.categoriaId || item.categoryId];
      const date = item.creatEn.toDate().toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      
      const itemUrl = `https://estanteriappbiblioteca.web.app/?book=${item.categoriaId || item.categoryId}&page=${item.id}`;
      
      return `
        <div style="margin-bottom: 25px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 2px solid black; background-color: white; box-shadow: 6px 6px 0px black;">
            <tr>
              <td style="padding: 20px;">
                <div style="text-transform: uppercase; font-size: 10px; letter-spacing: 2px; color: ${cat.color || '#E63946'}; font-weight: bold; margin-bottom: 5px;">
                  ${cat.nom} <span style="opacity: 0.6; font-weight: normal; color: #666;">| Per ${item.autor}</span>
                </div>
                <h2 style="font-family: 'Georgia', serif; font-size: 24px; margin: 10px 0;">
                  <a href="${itemUrl}" target="_blank" style="color: #E63946; text-decoration: none;">${item.titol}</a>
                </h2>
                <p style="font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 15px;">${item.comentari}</p>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-size: 11px; color: #999;">${date}</td>
                    <td align="right">
                      <a href="${itemUrl}" target="_blank" style="color: #E63946; font-weight: bold; font-size: 13px; text-decoration: none;">Llegir la pàgina &rarr;</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `;
    }).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="background-color: #F5F5DC; font-family: 'Helvetica', Arial, sans-serif; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 12px; letter-spacing: 4px; color: #E63946; font-weight: 100;">BIBLIOTECA</div>
            <h1 style="font-family: 'Georgia', serif; font-size: 40px; color: #E63946; margin: 0;">Estanteriapp</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 10px;">Novetats de la Setmana</h3>
            <p style="font-size: 14px; opacity: 0.7;">Aquestes són les pàgines que s'han afegit a la biblioteca en els darrers 7 dies.</p>
          </div>

          ${itemsHtml}

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.1);">
            <a href="https://estanteriappbiblioteca.web.app" style="background: #E63946; color: white; padding: 12px 30px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; border: 2px solid black; box-shadow: 4px 4px 0px black;">Anar a la Biblioteca</a>
            <p style="font-size: 11px; opacity: 0.4; margin-top: 20px;">Aquest és un correu automàtic de la vostra Estanteriapp.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Enviar el correu només a la Laura per provar (Sorpresa!)
    const recipients = ['lauradb12@gmail.com'];
    
    await transporter.sendMail({
      from: '"Estanteriapp" <lauradb12@gmail.com>',
      to: recipients.join(', '),
      subject: `📖 Newsletter Estanteriapp: ${recentItems.length} novetats aquesta setmana`,
      html: emailHtml
    });

    console.log('Newsletter enviada correctament!');

  } catch (error) {
    console.error('Error enviant la newsletter:', error);
    process.exit(1);
  }
}

sendNewsletter();
